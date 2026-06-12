use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

// Database schema definitions
const INIT_SCHEMA: &str = r#"
    CREATE TABLE IF NOT EXISTS containers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        colour TEXT,
        para TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        position INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        container_id TEXT,
        kind TEXT DEFAULT 'note',
        stage TEXT DEFAULT 'captured',
        title TEXT,
        essence TEXT,
        body TEXT,
        status TEXT DEFAULT 'active',
        due_date TEXT,
        map_x REAL DEFAULT 0,
        map_y REAL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        colour TEXT,
        parent_id TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS item_tags (
        item_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        position INTEGER DEFAULT 0,
        PRIMARY KEY (item_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS links (
        from_item TEXT NOT NULL,
        to_item TEXT NOT NULL,
        label TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (from_item, to_item)
    );

    CREATE TABLE IF NOT EXISTS canvases (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        container_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS ft_search USING fts5(
        title, essence, body, tokenize="unicode61"
    );

    CREATE INDEX IF NOT EXISTS idx_items_container ON items(container_id);
    CREATE INDEX IF NOT EXISTS idx_items_stage ON items(stage);
    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
    CREATE INDEX IF NOT EXISTS idx_tags_parent ON tags(parent_id);
    CREATE INDEX IF NOT EXISTS idx_links_from ON links(from_item);
    CREATE INDEX IF NOT EXISTS idx_links_to ON links(to_item);
"#;

// Triggers for FTS5 synchronization
const FTS_TRIGGERS: &str = r#"
    CREATE TRIGGER IF NOT EXISTS items_insert_fts AFTER INSERT ON items
    BEGIN
        INSERT INTO ft_search(rowid, title, essence, body)
        VALUES (new.id, new.title, new.essence, new.body);
    END;

    CREATE TRIGGER IF NOT EXISTS items_update_fts AFTER UPDATE ON items
    BEGIN
        UPDATE ft_search SET title = new.title, essence = new.essence, body = new.body
        WHERE rowid = new.id;
    END;

    CREATE TRIGGER IF NOT EXISTS items_delete_fts AFTER DELETE ON items
    BEGIN
        DELETE FROM ft_search WHERE rowid = old.id;
    END;
"#;

// Data transfer objects
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Container {
    pub id: String,
    pub name: String,
    pub colour: Option<String>,
    pub para: String,
    pub status: String,
    pub position: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Item {
    pub id: String,
    pub container_id: Option<String>,
    pub kind: String,
    pub stage: String,
    pub title: Option<String>,
    pub essence: Option<String>,
    pub body: Option<String>,
    pub status: String,
    pub due_date: Option<String>,
    pub map_x: f64,
    pub map_y: f64,
    pub created_at: String,
    pub updated_at: String,
    pub archived_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub colour: Option<String>,
    pub parent_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ItemTag {
    pub item_id: String,
    pub tag_id: String,
    pub position: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Link {
    pub from_item: String,
    pub to_item: String,
    pub label: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Canvas {
    pub id: String,
    pub name: String,
    pub data: String,
    pub container_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// Request/Response types
#[derive(Debug, Serialize, Deserialize)]
pub struct DbResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContainersResponse {
    pub containers: Vec<Container>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ItemsResponse {
    pub items: Vec<Item>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FullDataResponse {
    pub containers: Vec<Container>,
    pub items: Vec<Item>,
    pub tags: Vec<Tag>,
    pub item_tags: Vec<ItemTag>,
    pub links: Vec<Link>,
    pub canvases: Vec<Canvas>,
}

// Helper function to get current timestamp
fn now() -> String {
    use chrono::Utc;
    Utc::now().to_rfc3339()
}

// Helper function to generate ULID
fn generate_ulid() -> String {
    ulid::Ulid::new().to_string()
}

// Database commands
#[tauri::command]
async fn init_database(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>
) -> Result<DbResponse<String>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    // Execute schema
    conn.execute(INIT_SCHEMA).await.map_err(|e| e.to_string())?;
    
    // Execute FTS triggers
    conn.execute(FTS_TRIGGERS).await.map_err(|e| e.to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some("Database initialized successfully".to_string()),
        error: None,
    })
}

#[tauri::command]
async fn get_all_data(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>
) -> Result<DbResponse<FullDataResponse>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    let containers: Vec<Container> = conn
        .query("SELECT * FROM containers ORDER BY position ASC")
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|row| Container {
            id: row.get("id"),
            name: row.get("name"),
            colour: row.get("colour"),
            para: row.get("para"),
            status: row.get("status"),
            position: row.get("position"),
            created_at: row.get("created_at"),
        })
        .collect();
    
    let items: Vec<Item> = conn
        .query("SELECT * FROM items WHERE archived_at IS NULL ORDER BY created_at DESC")
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|row| Item {
            id: row.get("id"),
            container_id: row.get("container_id"),
            kind: row.get("kind"),
            stage: row.get("stage"),
            title: row.get("title"),
            essence: row.get("essence"),
            body: row.get("body"),
            status: row.get("status"),
            due_date: row.get("due_date"),
            map_x: row.get("map_x"),
            map_y: row.get("map_y"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            archived_at: row.get("archived_at"),
        })
        .collect();
    
    let tags: Vec<Tag> = conn
        .query("SELECT * FROM tags ORDER BY name ASC")
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|row| Tag {
            id: row.get("id"),
            name: row.get("name"),
            colour: row.get("colour"),
            parent_id: row.get("parent_id"),
            created_at: row.get("created_at"),
        })
        .collect();
    
    let item_tags: Vec<ItemTag> = conn
        .query("SELECT * FROM item_tags ORDER BY item_id, position ASC")
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|row| ItemTag {
            item_id: row.get("item_id"),
            tag_id: row.get("tag_id"),
            position: row.get("position"),
        })
        .collect();
    
    let links: Vec<Link> = conn
        .query("SELECT * FROM links ORDER BY created_at DESC")
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|row| Link {
            from_item: row.get("from_item"),
            to_item: row.get("to_item"),
            label: row.get("label"),
            created_at: row.get("created_at"),
        })
        .collect();
    
    let canvases: Vec<Canvas> = conn
        .query("SELECT * FROM canvases ORDER BY updated_at DESC")
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|row| Canvas {
            id: row.get("id"),
            name: row.get("name"),
            data: row.get("data"),
            container_id: row.get("container_id"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
        .collect();
    
    Ok(DbResponse {
        success: true,
        data: Some(FullDataResponse {
            containers,
            items,
            tags,
            item_tags,
            links,
            canvases,
        }),
        error: None,
    })
}

#[tauri::command]
async fn create_container(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    name: String,
    para: String,
    colour: Option<String>,
) -> Result<DbResponse<Container>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    let id = generate_ulid();
    let now = now();
    
    let position: i32 = conn
        .query("SELECT COALESCE(MAX(position), 0) + 1 FROM containers")
        .await
        .map_err(|e| e.to_string())?
        .get(0)
        .map(|row: tauri_plugin_sql::Row| row.get(0))
        .unwrap_or(0);
    
    conn.execute(
        "INSERT INTO containers (id, name, colour, para, position, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (id.clone(), name, colour, para, position, now.clone())
    ).await.map_err(|e| e.to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some(Container {
            id,
            name,
            colour,
            para,
            status: "active".to_string(),
            position,
            created_at: now,
        }),
        error: None,
    })
}

#[tauri::command]
async fn update_container(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    id: String,
    updates: HashMap<String, String>,
) -> Result<DbResponse<Container>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    let mut set_clauses = Vec::new();
    let mut values = Vec::new();
    
    for (key, value) in updates {
        set_clauses.push(format!("{} = ?", key));
        values.push(value);
    }
    
    values.push(id.clone());
    
    let query = format!(
        "UPDATE containers SET {} WHERE id = ? RETURNING *",
        set_clauses.join(", ")
    );
    
    let row = conn
        .query(&query, values)
        .await
        .map_err(|e| e.to_string())?
        .get(0)
        .ok_or("Container not found".to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some(Container {
            id: row.get("id"),
            name: row.get("name"),
            colour: row.get("colour"),
            para: row.get("para"),
            status: row.get("status"),
            position: row.get("position"),
            created_at: row.get("created_at"),
        }),
        error: None,
    })
}

#[tauri::command]
async fn delete_container(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    id: String,
) -> Result<DbResponse<String>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    // Move items to inbox (container_id = NULL)
    conn.execute(
        "UPDATE items SET container_id = NULL WHERE container_id = ?",
        (id.clone(),)
    ).await.map_err(|e| e.to_string())?;
    
    // Delete container
    conn.execute(
        "DELETE FROM containers WHERE id = ?",
        (id,)
    ).await.map_err(|e| e.to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some("Container deleted and items moved to inbox".to_string()),
        error: None,
    })
}

#[tauri::command]
async fn create_item(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    container_id: Option<String>,
    kind: String,
    title: Option<String>,
    body: Option<String>,
    map_x: f64,
    map_y: f64,
) -> Result<DbResponse<Item>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    let id = generate_ulid();
    let now = now();
    
    // Determine stage based on container
    let stage = if container_id.is_some() {
        "organised".to_string()
    } else {
        "captured".to_string()
    };
    
    conn.execute(
        "INSERT INTO items (id, container_id, kind, stage, title, body, map_x, map_y, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (id.clone(), container_id, kind, stage, title, body, map_x, map_y, now.clone(), now.clone())
    ).await.map_err(|e| e.to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some(Item {
            id,
            container_id,
            kind,
            stage,
            title,
            essence: None,
            body,
            status: "active".to_string(),
            due_date: None,
            map_x,
            map_y,
            created_at: now.clone(),
            updated_at: now,
            archived_at: None,
        }),
        error: None,
    })
}

#[tauri::command]
async fn update_item(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    id: String,
    updates: HashMap<String, serde_json::Value>,
) -> Result<DbResponse<Item>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    let mut set_clauses = Vec::new();
    let mut values = Vec::new();
    
    for (key, value) in updates {
        set_clauses.push(format!("{} = ?", key));
        match value {
            serde_json::Value::String(s) => values.push(s),
            serde_json::Value::Number(n) => {
                if n.is_f64() {
                    values.push(n.as_f64().unwrap().to_string());
                } else {
                    values.push(n.to_string());
                }
            }
            serde_json::Value::Bool(b) => values.push(b.to_string()),
            serde_json::Value::Null => values.push("NULL".to_string()),
            _ => values.push(value.to_string()),
        }
    }
    
    // Always update updated_at
    set_clauses.push("updated_at = ?".to_string());
    values.push(now());
    
    values.push(id.clone());
    
    let query = format!(
        "UPDATE items SET {} WHERE id = ? RETURNING *",
        set_clauses.join(", ")
    );
    
    let row = conn
        .query(&query, values)
        .await
        .map_err(|e| e.to_string())?
        .get(0)
        .ok_or("Item not found".to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some(Item {
            id: row.get("id"),
            container_id: row.get("container_id"),
            kind: row.get("kind"),
            stage: row.get("stage"),
            title: row.get("title"),
            essence: row.get("essence"),
            body: row.get("body"),
            status: row.get("status"),
            due_date: row.get("due_date"),
            map_x: row.get("map_x"),
            map_y: row.get("map_y"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            archived_at: row.get("archived_at"),
        }),
        error: None,
    })
}

#[tauri::command]
async fn move_item_to_container(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    item_id: String,
    container_id: Option<String>,
) -> Result<DbResponse<Item>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    let now = now();
    
    // If moving from inbox (NULL) to a container, auto-set stage to organised
    let stage = if container_id.is_some() {
        let current: Option<Item> = conn
            .query("SELECT container_id, stage FROM items WHERE id = ?", (item_id.clone(),))
            .await
            .map_err(|e| e.to_string())?
            .get(0)
            .map(|row| Item {
                id: row.get("id"),
                container_id: row.get("container_id"),
                kind: row.get("kind"),
                stage: row.get("stage"),
                title: row.get("title"),
                essence: row.get("essence"),
                body: row.get("body"),
                status: row.get("status"),
                due_date: row.get("due_date"),
                map_x: row.get("map_x"),
                map_y: row.get("map_y"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                archived_at: row.get("archived_at"),
            });
        
        if let Some(item) = current {
            if item.container_id.is_none() && item.stage == "captured" {
                "organised".to_string()
            } else {
                item.stage
            }
        } else {
            "organised".to_string()
        }
    } else {
        "captured".to_string()
    };
    
    conn.execute(
        "UPDATE items SET container_id = ?, stage = ?, updated_at = ? WHERE id = ?",
        (container_id, stage, now.clone(), item_id.clone())
    ).await.map_err(|e| e.to_string())?;
    
    let row = conn
        .query("SELECT * FROM items WHERE id = ?", (item_id,))
        .await
        .map_err(|e| e.to_string())?
        .get(0)
        .ok_or("Item not found".to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some(Item {
            id: row.get("id"),
            container_id: row.get("container_id"),
            kind: row.get("kind"),
            stage: row.get("stage"),
            title: row.get("title"),
            essence: row.get("essence"),
            body: row.get("body"),
            status: row.get("status"),
            due_date: row.get("due_date"),
            map_x: row.get("map_x"),
            map_y: row.get("map_y"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            archived_at: row.get("archived_at"),
        }),
        error: None,
    })
}

#[tauri::command]
async fn archive_item(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    id: String,
) -> Result<DbResponse<String>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    let now = now();
    
    conn.execute(
        "UPDATE items SET archived_at = ?, updated_at = ? WHERE id = ?",
        (now.clone(), now, id)
    ).await.map_err(|e| e.to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some("Item archived".to_string()),
        error: None,
    })
}

#[tauri::command]
async fn delete_item(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    id: String,
) -> Result<DbResponse<String>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    // Delete related data
    conn.execute("DELETE FROM item_tags WHERE item_id = ?", (id.clone(),))
        .await
        .map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM links WHERE from_item = ? OR to_item = ?", (id.clone(), id.clone()))
        .await
        .map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM items WHERE id = ?", (id,))
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some("Item and related data deleted".to_string()),
        error: None,
    })
}

#[tauri::command]
async fn create_tag(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    name: String,
    colour: Option<String>,
    parent_id: Option<String>,
) -> Result<DbResponse<Tag>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    let id = generate_ulid();
    let now = now();
    
    conn.execute(
        "INSERT INTO tags (id, name, colour, parent_id, created_at) VALUES (?, ?, ?, ?, ?)",
        (id.clone(), name, colour, parent_id, now.clone())
    ).await.map_err(|e| e.to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some(Tag {
            id,
            name,
            colour,
            parent_id,
            created_at: now,
        }),
        error: None,
    })
}

#[tauri::command]
async fn create_link(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    from_item: String,
    to_item: String,
    label: Option<String>,
) -> Result<DbResponse<Link>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    let now = now();
    
    conn.execute(
        "INSERT INTO links (from_item, to_item, label, created_at) VALUES (?, ?, ?, ?)",
        (from_item.clone(), to_item.clone(), label, now.clone())
    ).await.map_err(|e| e.to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some(Link {
            from_item,
            to_item,
            label,
            created_at: now,
        }),
        error: None,
    })
}

#[tauri::command]
async fn delete_link(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    from_item: String,
    to_item: String,
) -> Result<DbResponse<String>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    conn.execute(
        "DELETE FROM links WHERE from_item = ? AND to_item = ?",
        (from_item, to_item)
    ).await.map_err(|e| e.to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some("Link deleted".to_string()),
        error: None,
    })
}

#[tauri::command]
async fn assign_tag_to_item(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    item_id: String,
    tag_id: String,
    position: i32,
) -> Result<DbResponse<ItemTag>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT OR REPLACE INTO item_tags (item_id, tag_id, position) VALUES (?, ?, ?)",
        (item_id.clone(), tag_id.clone(), position)
    ).await.map_err(|e| e.to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some(ItemTag {
            item_id,
            tag_id,
            position,
        }),
        error: None,
    })
}

#[tauri::command]
async fn remove_tag_from_item(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    item_id: String,
    tag_id: String,
) -> Result<DbResponse<String>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    conn.execute(
        "DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?",
        (item_id, tag_id)
    ).await.map_err(|e| e.to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some("Tag removed from item".to_string()),
        error: None,
    })
}

#[tauri::command]
async fn save_canvas(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    name: String,
    data: String,
    container_id: Option<String>,
) -> Result<DbResponse<Canvas>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    let id = generate_ulid();
    let now = now();
    
    conn.execute(
        "INSERT INTO canvases (id, name, data, container_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (id.clone(), name, data, container_id, now.clone(), now.clone())
    ).await.map_err(|e| e.to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some(Canvas {
            id,
            name,
            data,
            container_id,
            created_at: now.clone(),
            updated_at: now,
        }),
        error: None,
    })
}

#[tauri::command]
async fn update_canvas(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    id: String,
    data: String,
) -> Result<DbResponse<Canvas>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    let now = now();
    
    conn.execute(
        "UPDATE canvases SET data = ?, updated_at = ? WHERE id = ?",
        (data, now.clone(), id.clone())
    ).await.map_err(|e| e.to_string())?;
    
    let row = conn
        .query("SELECT * FROM canvases WHERE id = ?", (id,))
        .await
        .map_err(|e| e.to_string())?
        .get(0)
        .ok_or("Canvas not found".to_string())?;
    
    Ok(DbResponse {
        success: true,
        data: Some(Canvas {
            id: row.get("id"),
            name: row.get("name"),
            data: row.get("data"),
            container_id: row.get("container_id"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }),
        error: None,
    })
}

#[tauri::command]
async fn search_items(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    query: String,
) -> Result<DbResponse<Vec<Item>>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    let search_query = format!(
        "SELECT * FROM items WHERE id IN (SELECT rowid FROM ft_search WHERE ft_search MATCH ?) AND archived_at IS NULL",
        query
    );
    
    let items: Vec<Item> = conn
        .query(&search_query, (query,))
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|row| Item {
            id: row.get("id"),
            container_id: row.get("container_id"),
            kind: row.get("kind"),
            stage: row.get("stage"),
            title: row.get("title"),
            essence: row.get("essence"),
            body: row.get("body"),
            status: row.get("status"),
            due_date: row.get("due_date"),
            map_x: row.get("map_x"),
            map_y: row.get("map_y"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            archived_at: row.get("archived_at"),
        })
        .collect();
    
    Ok(DbResponse {
        success: true,
        data: Some(items),
        error: None,
    })
}

#[tauri::command]
async fn get_items_by_container(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    container_id: Option<String>,
) -> Result<DbResponse<Vec<Item>>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    let query = if let Some(id) = container_id {
        "SELECT * FROM items WHERE container_id = ? AND archived_at IS NULL ORDER BY created_at DESC"
    } else {
        "SELECT * FROM items WHERE container_id IS NULL AND archived_at IS NULL ORDER BY created_at DESC"
    };
    
    let items: Vec<Item> = if let Some(id) = container_id {
        conn.query(query, (id,))
            .await
            .map_err(|e| e.to_string())?
            .into_iter()
            .map(|row| Item {
                id: row.get("id"),
                container_id: row.get("container_id"),
                kind: row.get("kind"),
                stage: row.get("stage"),
                title: row.get("title"),
                essence: row.get("essence"),
                body: row.get("body"),
                status: row.get("status"),
                due_date: row.get("due_date"),
                map_x: row.get("map_x"),
                map_y: row.get("map_y"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                archived_at: row.get("archived_at"),
            })
            .collect()
    } else {
        conn.query(query, ())
            .await
            .map_err(|e| e.to_string())?
            .into_iter()
            .map(|row| Item {
                id: row.get("id"),
                container_id: row.get("container_id"),
                kind: row.get("kind"),
                stage: row.get("stage"),
                title: row.get("title"),
                essence: row.get("essence"),
                body: row.get("body"),
                status: row.get("status"),
                due_date: row.get("due_date"),
                map_x: row.get("map_x"),
                map_y: row.get("map_y"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                archived_at: row.get("archived_at"),
            })
            .collect()
    };
    
    Ok(DbResponse {
        success: true,
        data: Some(items),
        error: None,
    })
}

#[tauri::command]
async fn get_archived_items(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>
) -> Result<DbResponse<Vec<Item>>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    let items: Vec<Item> = conn
        .query("SELECT * FROM items WHERE archived_at IS NOT NULL ORDER BY archived_at DESC")
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|row| Item {
            id: row.get("id"),
            container_id: row.get("container_id"),
            kind: row.get("kind"),
            stage: row.get("stage"),
            title: row.get("title"),
            essence: row.get("essence"),
            body: row.get("body"),
            status: row.get("status"),
            due_date: row.get("due_date"),
            map_x: row.get("map_x"),
            map_y: row.get("map_y"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            archived_at: row.get("archived_at"),
        })
        .collect();
    
    Ok(DbResponse {
        success: true,
        data: Some(items),
        error: None,
    })
}

#[tauri::command]
async fn get_items_by_tag(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>,
    tag_id: String,
) -> Result<DbResponse<Vec<Item>>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    let items: Vec<Item> = conn
        .query(
            "SELECT i.* FROM items i JOIN item_tags it ON i.id = it.item_id WHERE it.tag_id = ? AND i.archived_at IS NULL",
            (tag_id,)
        )
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|row| Item {
            id: row.get("id"),
            container_id: row.get("container_id"),
            kind: row.get("kind"),
            stage: row.get("stage"),
            title: row.get("title"),
            essence: row.get("essence"),
            body: row.get("body"),
            status: row.get("status"),
            due_date: row.get("due_date"),
            map_x: row.get("map_x"),
            map_y: row.get("map_y"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            archived_at: row.get("archived_at"),
        })
        .collect();
    
    Ok(DbResponse {
        success: true,
        data: Some(items),
        error: None,
    })
}

#[tauri::command]
async fn get_evidence_items(
    state: tauri::State<'_, tauri_plugin_sql::ConnectionPool>
) -> Result<DbResponse<Vec<Item>>, String> {
    let conn = state.get().map_err(|e| e.to_string())?;
    
    // Find tag with name "evidence"
    let tag_id: Option<String> = conn
        .query("SELECT id FROM tags WHERE name = 'evidence'")
        .await
        .map_err(|e| e.to_string())?
        .get(0)
        .map(|row| row.get("id"));
    
    if let Some(tag_id) = tag_id {
        let items: Vec<Item> = conn
            .query(
                "SELECT i.* FROM items i JOIN item_tags it ON i.id = it.item_id WHERE it.tag_id = ? AND i.archived_at IS NULL",
                (tag_id,)
            )
            .await
            .map_err(|e| e.to_string())?
            .into_iter()
            .map(|row| Item {
                id: row.get("id"),
                container_id: row.get("container_id"),
                kind: row.get("kind"),
                stage: row.get("stage"),
                title: row.get("title"),
                essence: row.get("essence"),
                body: row.get("body"),
                status: row.get("status"),
                due_date: row.get("due_date"),
                map_x: row.get("map_x"),
                map_y: row.get("map_y"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                archived_at: row.get("archived_at"),
            })
            .collect();
        
        Ok(DbResponse {
            success: true,
            data: Some(items),
            error: None,
        })
    } else {
        Ok(DbResponse {
            success: true,
            data: Some(Vec::new()),
            error: None,
        })
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations([
                    Migration {
                        name: "init_schema",
                        sql: INIT_SCHEMA,
                        kind: MigrationKind::Up,
                    },
                    Migration {
                        name: "fts_triggers",
                        sql: FTS_TRIGGERS,
                        kind: MigrationKind::Up,
                    },
                ])
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            init_database,
            get_all_data,
            create_container,
            update_container,
            delete_container,
            create_item,
            update_item,
            move_item_to_container,
            archive_item,
            delete_item,
            create_tag,
            create_link,
            delete_link,
            assign_tag_to_item,
            remove_tag_from_item,
            save_canvas,
            update_canvas,
            search_items,
            get_items_by_container,
            get_archived_items,
            get_items_by_tag,
            get_evidence_items,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
