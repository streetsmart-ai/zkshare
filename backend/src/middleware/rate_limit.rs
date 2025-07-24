use axum::{
    http::Request, 
    response::Response, 
    middleware::Next, 
    http::StatusCode, 
    body::Body,
    extract::State
};
use redis::AsyncCommands;
use std::net::SocketAddr;
use std::env;
use redis::Client;
use std::sync::Arc;

pub async fn rate_limit(
    State(redis_client): State<Arc<Client>>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    println!("[DEBUG] Entered rate_limit middleware");
    println!("[DEBUG] Got Redis client from state");
    
    let redis = redis_client.clone();
    
    let ip = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .split(',')
        .next()
        .unwrap_or("")
        .trim()
        .to_string();
        
    let ip = if ip.is_empty() {
        req.extensions()
            .get::<SocketAddr>()
            .map(|addr| addr.ip().to_string())
            .unwrap_or_else(|| "unknown".to_string())
    } else {
        ip
    };
    
    let max = env::var("RATE_LIMIT_MAX").ok().and_then(|v| v.parse().ok()).unwrap_or(10);
    let window = env::var("RATE_LIMIT_WINDOW").ok().and_then(|v| v.parse().ok()).unwrap_or(3600);
    let key = format!("ratelimit:{}", ip);
    
    let mut conn = redis.get_async_connection().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let count: u32 = conn.incr(&key, 1).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    if count == 1 {
        let _: () = conn.expire(&key, window).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }
    
    if count > max {
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }
    
    Ok(next.run(req).await)
}