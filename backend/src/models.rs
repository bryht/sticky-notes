use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Note {
    pub id: Uuid,
    pub user_id: Uuid,
    pub content: String,  // Encrypted HTML content
    pub position: serde_json::Value,  // {"top": "100px", "left": "200px"}
    pub size: serde_json::Value,  // {"width": "250px", "height": "200px"}
    pub color: String,  // "yellow" | "pink" | etc.
    pub minimized: bool,
    pub url: String,  // Encrypted URL
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateNoteRequest {
    pub content: String,
    pub position: serde_json::Value,
    pub size: serde_json::Value,
    pub color: String,
    pub minimized: bool,
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateNoteRequest {
    pub content: Option<String>,
    pub position: Option<serde_json::Value>,
    pub size: Option<serde_json::Value>,
    pub color: Option<String>,
    pub minimized: Option<bool>,
    pub url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct User {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug)]
pub struct UserWithApiKey {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
}
