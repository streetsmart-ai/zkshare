use axum::{extract::State, Json, response::IntoResponse, http::StatusCode};
use rand::RngCore;
use rand::rngs::OsRng;
use sha2::{Sha256, Digest};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use chrono::{Utc, Duration};
use serde::Deserialize;
use crate::models::token::{TokenPair, StoredToken};
use std::env;
use std::sync::Arc;

#[derive(Deserialize)]
pub struct TokenRequest {
    pub ttl_hours: Option<u32>,
    pub multi: Option<bool>,
}

pub async fn create_token(
    State(redis): State<Arc<redis::Client>>,
    Json(req): Json<TokenRequest>,
) -> impl IntoResponse {
    println!("[DEBUG] Entered create_token handler");
    let mut rng = OsRng;
    let mut token_a_bytes = [0u8; 32];
    let mut token_b_bytes = [0u8; 32];
    rng.fill_bytes(&mut token_a_bytes);
    rng.fill_bytes(&mut token_b_bytes);
    let token_a = URL_SAFE_NO_PAD.encode(&token_a_bytes);
    let token_b = URL_SAFE_NO_PAD.encode(&token_b_bytes);
    let ttl = req.ttl_hours.unwrap_or_else(|| env::var("RATE_LIMIT_WINDOW").ok().and_then(|v| v.parse().ok()).unwrap_or(24));
    let expires = Utc::now() + Duration::hours(ttl as i64);
    let stored = StoredToken {
        token_a: token_a.clone(),
        token_b: token_b.clone(),
        expires,
        created_at: Utc::now(),
        multi: req.multi.unwrap_or(false),
    };
    println!("[DEBUG] Before getting Redis connection");
    let mut conn = match redis.get_async_connection().await {
        Ok(c) => c,
        Err(e) => {
            println!("[ERROR] Redis connection failed: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Redis connection failed"}))).into_response();
        }
    };
    println!("[DEBUG] Got Redis connection");
    // Use token_b as the key for easier lookup
    let key = format!("token:{}", token_b);
    println!("[DEBUG] Before Redis pipe");
    let pipe_result: redis::RedisResult<()> = redis::pipe()
        .cmd("SET")
        .arg(&key)
        .arg(serde_json::to_string(&stored).unwrap())
        .ignore()
        .cmd("EXPIRE")
        .arg(&key)
        .arg(ttl * 3600)
        .query_async(&mut conn)
        .await;
    match pipe_result {
        Ok(_) => println!("[DEBUG] Redis pipe succeeded"),
        Err(e) => {
            println!("[ERROR] Redis pipe failed: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Redis pipe failed"}))).into_response();
        }
    }
    let pair = TokenPair { token_a, token_b, expires };
    Json(pair).into_response()
}

#[derive(Deserialize)]
pub struct DecryptRequest {
    pub token_a: String,
}

pub async fn decrypt_token(
    State(redis): State<Arc<redis::Client>>,
    Json(req): Json<DecryptRequest>,
) -> impl IntoResponse {
    use serde_json::json;
    // Hash tokenA for lookup
    let mut hasher = Sha256::new();
    hasher.update(&req.token_a);
    let token_a_hash = format!("{:x}", hasher.finalize());
    
    // Search for token_a_hash in Redis
    let mut conn = match redis.get_async_connection().await {
        Ok(c) => c,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Redis unavailable"}))),
    };

    // Search through all keys to find the one with matching token_a_hash
    let keys: Vec<String> = match redis::cmd("KEYS").arg("token:*").query_async(&mut conn).await {
        Ok(k) => k,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to search tokens"}))),
    };

    let mut token_b = None;
    let mut is_multi_use = false;

    for key in &keys {
        if let Ok(Some(json_str)) = redis::cmd("GET").arg(key).query_async::<_, Option<String>>(&mut conn).await {
            if let Ok(stored) = serde_json::from_str::<StoredToken>(&json_str) {
                // Hash the stored token_a to compare
                let mut hasher = Sha256::new();
                hasher.update(&stored.token_a);
                let stored_hash = format!("{:x}", hasher.finalize());
                if stored_hash == token_a_hash {
                    token_b = Some(stored.token_b);
                    is_multi_use = stored.multi;
                    break;
                }
            }
        }
    }

    // Log access attempt
    println!("[AUDIT] /api/decrypt attempt at {} for hash {}: {}", chrono::Utc::now(), token_a_hash, token_b.is_some());
    
    match token_b {
        Some(tb) => {
            if !is_multi_use {
                // Delete the token if it's single-use
                for key in &keys {
                    if let Ok(Some(json_str)) = redis::cmd("GET").arg(key).query_async::<_, Option<String>>(&mut conn).await {
                        if let Ok(stored) = serde_json::from_str::<StoredToken>(&json_str) {
                            let mut hasher = Sha256::new();
                            hasher.update(&stored.token_a);
                            let stored_hash = format!("{:x}", hasher.finalize());
                            if stored_hash == token_a_hash {
                                let _: () = redis::cmd("DEL").arg(key).query_async(&mut conn).await.unwrap_or(());
                                break;
                            }
                        }
                    }
                }
            }
            (StatusCode::OK, Json(json!({"token_b": tb})))
        },
        None => (StatusCode::NOT_FOUND, Json(json!({"error": "Token not found or already used"}))),
    }
}

#[derive(Deserialize)]
pub struct GetTokenRequest {
    pub token_b: String,
}

#[derive(Deserialize)]
pub struct DeleteTokenRequest {
    pub token_b: String,
}

pub async fn get_token(
    State(redis): State<Arc<redis::Client>>,
    Json(req): Json<GetTokenRequest>,
) -> impl IntoResponse {
    use serde_json::json;
    
    // Get token_a using token_b as key
    let key = format!("token:{}", req.token_b);
    let mut conn = match redis.get_async_connection().await {
        Ok(c) => c,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Redis unavailable"}))),
    };

    let val: Option<String> = redis::cmd("GET").arg(&key).query_async::<_, Option<String>>(&mut conn).await.unwrap_or(None);
    
    match val {
        Some(json_str) => {
            let stored: StoredToken = match serde_json::from_str(&json_str) {
                Ok(s) => s,
                Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Corrupt token data"}))),
            };
            
            // Check if token has expired
            if stored.expires < Utc::now() {
                // Delete expired token
                let _: () = redis::cmd("DEL").arg(&key).query_async(&mut conn).await.unwrap_or(());
                return (StatusCode::NOT_FOUND, Json(json!({"error": "Token expired"})));
            }
            
            // Log access attempt
            println!("[AUDIT] /api/tokens/get attempt at {} for token_b {}: success", chrono::Utc::now(), req.token_b);
            
            (StatusCode::OK, Json(json!({"token_a": stored.token_a, "should_delete": !stored.multi})))
        },
        None => {
            println!("[AUDIT] /api/tokens/get attempt at {} for token_b {}: not found", chrono::Utc::now(), req.token_b);
            (StatusCode::NOT_FOUND, Json(json!({"error": "Token not found or already used"})))
        },
    }
}

pub async fn delete_token(
    State(redis): State<Arc<redis::Client>>,
    Json(req): Json<DeleteTokenRequest>,
) -> impl IntoResponse {
    use serde_json::json;
    
    let key = format!("token:{}", req.token_b);
    let mut conn = match redis.get_async_connection().await {
        Ok(c) => c,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Redis unavailable"}))),
    };

    let deleted: i32 = redis::cmd("DEL").arg(&key).query_async(&mut conn).await.unwrap_or(0);
    
    if deleted > 0 {
        println!("[AUDIT] /api/tokens/delete attempt at {} for token_b {}: deleted", chrono::Utc::now(), req.token_b);
        (StatusCode::OK, Json(json!({"success": true})))
    } else {
        println!("[AUDIT] /api/tokens/delete attempt at {} for token_b {}: not found", chrono::Utc::now(), req.token_b);
        (StatusCode::NOT_FOUND, Json(json!({"error": "Token not found"})))
    }
} 