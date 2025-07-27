use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TokenPair {
    pub token_a: String, // 32+ bytes, URL-safe base64
    pub token_b: String, // 32+ bytes, URL-safe base64
    pub expires: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StoredToken {
    pub token_a: String,      // Original tokenA value
    pub token_b: String,      // Actual tokenB value
    pub expires: chrono::DateTime<chrono::Utc>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub multi: bool,          // Multi-use flag
} 