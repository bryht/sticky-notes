use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

const VALID_COLORS: &[&str] = &["yellow", "pink", "blue", "green", "purple", "white"];
const MAX_CONTENT_LEN: usize = 50_000;
const MAX_URL_LEN: usize = 2048;

#[derive(Debug, Serialize, Deserialize)]
pub struct Note {
    pub id: Uuid,
    pub user_id: Uuid,
    pub content: String,
    pub position: serde_json::Value,
    pub size: serde_json::Value,
    pub color: String,
    pub minimized: bool,
    pub url: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<tokio_postgres::Row> for Note {
    fn from(row: tokio_postgres::Row) -> Self {
        Self {
            id: row.get(0),
            user_id: row.get(1),
            content: row.get(2),
            position: row.get(3),
            size: row.get(4),
            color: row.get(5),
            minimized: row.get(6),
            url: row.get(7),
            created_at: row.get(8),
            updated_at: row.get(9),
        }
    }
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

impl CreateNoteRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.content.len() > MAX_CONTENT_LEN {
            return Err(format!("Content exceeds {} characters", MAX_CONTENT_LEN));
        }
        if !VALID_COLORS.contains(&self.color.as_str()) {
            return Err(format!("Invalid color '{}'. Must be one of: {}", self.color, VALID_COLORS.join(", ")));
        }
        if self.url.len() > MAX_URL_LEN {
            return Err(format!("URL exceeds {} characters", MAX_URL_LEN));
        }
        if !self.position.is_object() {
            return Err("Position must be a JSON object".to_string());
        }
        if !self.size.is_object() {
            return Err("Size must be a JSON object".to_string());
        }
        Ok(())
    }
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

impl UpdateNoteRequest {
    pub fn validate(&self) -> Result<(), String> {
        if let Some(ref content) = self.content {
            if content.len() > MAX_CONTENT_LEN {
                return Err(format!("Content exceeds {} characters", MAX_CONTENT_LEN));
            }
        }
        if let Some(ref color) = self.color {
            if !VALID_COLORS.contains(&color.as_str()) {
                return Err(format!("Invalid color '{}'. Must be one of: {}", color, VALID_COLORS.join(", ")));
            }
        }
        if let Some(ref url) = self.url {
            if url.len() > MAX_URL_LEN {
                return Err(format!("URL exceeds {} characters", MAX_URL_LEN));
            }
        }
        if let Some(ref position) = self.position {
            if !position.is_object() {
                return Err("Position must be a JSON object".to_string());
            }
        }
        if let Some(ref size) = self.size {
            if !size.is_object() {
                return Err("Size must be a JSON object".to_string());
            }
        }
        Ok(())
    }
}

#[derive(Debug, Serialize)]
pub struct User {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub api_key: String,
}

impl RegisterRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.api_key.len() < 16 {
            return Err("API key must be at least 16 characters".to_string());
        }
        if self.api_key.len() > 256 {
            return Err("API key must be at most 256 characters".to_string());
        }
        Ok(())
    }
}

#[derive(Debug, Serialize)]
pub struct RegisterResponse {
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}
