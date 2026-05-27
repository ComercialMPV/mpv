use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Deserialize)]
struct HttpRequestArgs {
    method: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
    body: Option<String>,
}

#[derive(Serialize)]
struct HttpResponseData {
    status: u16,
    status_text: String,
    headers: std::collections::HashMap<String, String>,
    body: Value,
}

#[tauri::command]
async fn http_request(args: HttpRequestArgs) -> Result<HttpResponseData, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(false)
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let mut req = match args.method.to_uppercase().as_str() {
        "GET" => client.get(&args.url),
        "POST" => {
            let mut r = client.post(&args.url);
            if let Some(body) = &args.body {
                r = r.body(body.clone());
            }
            r
        }
        "PUT" => {
            let mut r = client.put(&args.url);
            if let Some(body) = &args.body {
                r = r.body(body.clone());
            }
            r
        }
        "PATCH" => {
            let mut r = client.patch(&args.url);
            if let Some(body) = &args.body {
                r = r.body(body.clone());
            }
            r
        }
        "DELETE" => client.delete(&args.url),
        _ => return Err(format!("Unsupported method: {}", args.method)),
    };

    // Add headers
    for (key, value) in &args.headers {
        req = req.header(key.as_str(), value.as_str());
    }

    let response = req.send().await.map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("Unknown").to_string();

    let mut resp_headers = std::collections::HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            resp_headers.insert(key.to_string(), v.to_string());
        }
    }

    let body: Value = response.json().await.unwrap_or(Value::Null);

    Ok(HttpResponseData {
        status,
        status_text,
        headers: resp_headers,
        body,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![http_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
