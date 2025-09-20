const express = require("express");
const fetch = require("node-fetch");
const querystring = require("querystring");

const app = express();

const client_id = "f29ecf2ff45e4f01830756ab86853d86";
const client_secret = "f7dc06925d8d4b0c80da87722800ec75";
const redirect_uri = "https://YOUR-REPL-NAME.YOUR-USERNAME.repl.co/callback";

let refresh_token = "";
let access_token = "";

// Step 1: Login
app.get("/login", (req, res) => {
  const scope = "user-read-currently-playing";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
      })
  );
});

// Step 2: Callback
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization":
        "Basic " +
        Buffer.from(client_id + ":" + client_secret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: querystring.stringify({
      code: code,
      redirect_uri: redirect_uri,
      grant_type: "authorization_code",
    }),
  });
  const data = await response.json();
  access_token = data.access_token;
  refresh_token = data.refresh_token;
  res.send("✅ Spotify linked! You can close this tab now.");
});

// Refresh token function
async function refreshAccessToken() {
  if (!refresh_token) return;
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization":
        "Basic " +
        Buffer.from(client_id + ":" + client_secret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: querystring.stringify({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    }),
  });
  const data = await response.json();
  access_token = data.access_token;
}

// API to get current song
app.get("/song", async (req, res) => {
  if (!access_token) {
    return res.json({ song: "Not linked yet" });
  }

  await refreshAccessToken();

  const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: "Bearer " + access_token }
  });

  if (response.status === 204 || response.status > 400) {
    return res.json({ song: "Nothing playing" });
  }

  const data = await response.json();

  res.json({
    song: data.item.name,
    artist: data.item.artists.map(a => a.name).join(", "),
    albumCover: data.item.album.images[0].url,
    duration_ms: data.item.duration_ms,
    progress_ms: data.progress_ms
  });
});

app.listen(3000, () => {
  console.log("✅ Server running on port 3000");
});
