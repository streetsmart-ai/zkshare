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
    let mut hasher = Sha256::new();
    hasher.update(&token_a);
    let token_a_hash = format!("{:x}", hasher.finalize());
    let ttl = req.ttl_hours.unwrap_or_else(|| env::var("RATE_LIMIT_WINDOW").ok().and_then(|v| v.parse().ok()).unwrap_or(24));
    let expires = Utc::now() + Duration::hours(ttl as i64);
    let stored = StoredToken {
        token_a_hash: token_a_hash.clone(),
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
    let key = format!("token:{}", token_a_hash);
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
    // Hash tokenA
    let mut hasher = Sha256::new();
    hasher.update(&req.token_a);
    let token_a_hash = format!("{:x}", hasher.finalize());
    let key = format!("token:{}", token_a_hash);
    let mut conn = match redis.get_async_connection().await {
        Ok(c) => c,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Redis unavailable"}))),
    };
    // In decrypt_token:
    // Fetch the value, but only delete if not multi-use
    let val: Option<String> = if let Ok(Some(json_str)) = redis::cmd("GET").arg(&key).query_async::<_, Option<String>>(&mut conn).await {
        // Check if multi-use
        if let Ok(stored) = serde_json::from_str::<StoredToken>(&json_str) {
            if stored.multi {
                Some(json_str)
            } else {
                // Single-use: delete after use
                redis::cmd("GETDEL").arg(&key).query_async(&mut conn).await.ok()
            }
        } else {
            None
        }
    } else {
        None
    };
    // Log access attempt (print for now)
    println!("[AUDIT] /api/decrypt attempt at {} for hash {}: {}", chrono::Utc::now(), token_a_hash, val.is_some());
    match val {
        Some(json_str) => {
            let stored: StoredToken = match serde_json::from_str(&json_str) {
                Ok(s) => s,
                Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Corrupt token data"}))),
            };
            (StatusCode::OK, Json(json!({"token_b": stored.token_b})))
        },
        None => (StatusCode::NOT_FOUND, Json(json!({"error": "Token not found or already used"}))),
    }
} 