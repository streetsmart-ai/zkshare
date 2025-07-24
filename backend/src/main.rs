use axum::{routing::get, Router, response::IntoResponse, routing::any, http::StatusCode};
use dotenv::dotenv;
use std::env;
use tokio::net::TcpListener;
use tower_http::cors::{CorsLayer, Any};
use axum::http::Method;
use std::sync::Arc;

mod handlers {
    pub mod token;
}
mod models {
    pub mod token;
}
mod middleware {
    pub mod rate_limit;
}
use handlers::token::{create_token, decrypt_token};
use middleware::rate_limit::rate_limit;

async fn health() -> impl IntoResponse {
    (axum::http::StatusCode::OK, "OK")
}

#[tokio::main]
async fn main() {
    std::panic::set_hook(Box::new(|info| {
        println!("[PANIC] {:?}", info);
    }));
    dotenv().ok();
    let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
    let redis_client = Arc::new(redis::Client::open(redis_url).expect("Failed to connect to Redis"));

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/health", get(health))
        .route(
            "/api/tokens",
            axum::routing::post(create_token)
                .route_layer(axum::middleware::from_fn_with_state(
                    redis_client.clone(), 
                    rate_limit
                ))
        )
        .route(
            "/api/decrypt",
            axum::routing::post(decrypt_token)
                .route_layer(axum::middleware::from_fn_with_state(
                    redis_client.clone(), 
                    rate_limit
                ))
        )
        .fallback(any(|req: axum::http::Request<axum::body::Body>| async move {
            println!("[FALLBACK] Unmatched or failed request: {:?}", req);
            StatusCode::NOT_FOUND
        }))
        .with_state(redis_client.clone())
        .layer(cors);

    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "3001".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = TcpListener::bind(&addr).await.unwrap();
    println!("Listening on {}", addr);
    axum::serve(listener, app).await.unwrap();
}