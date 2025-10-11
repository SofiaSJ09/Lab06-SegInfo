"use strict";

// Imports
const express = require("express");
const session = require("express-session");
const { ExpressOIDC } = require("@okta/oidc-middleware");
const { Issuer } = require("openid-client");
const cons = require("consolidate");
const path = require("path");
require("dotenv").config();

// App setup
const app = express();

// Variables de entorno
const {
  OKTA_ISSUER_URI,
  OKTA_CLIENT_ID,
  OKTA_CLIENT_SECRET,
  REDIRECT_URI,
  BASE_URL,
  SECRET,
  PORT = 3000,
} = process.env;

// OIDC Middleware (Okta)
const oidc = new ExpressOIDC({
  issuer: OKTA_ISSUER_URI,
  client_id: OKTA_CLIENT_ID,
  client_secret: OKTA_CLIENT_SECRET,
  redirect_uri: REDIRECT_URI,
  appBaseUrl: BASE_URL, // ¡sin "/" al final!
  routes: {
    callback: {
      defaultRedirect: `${BASE_URL}/dashboard`,
    },
  },
  scope: "openid profile",
});

// Configurar sesión (con opciones obligatorias)
app.use(
  session({
    cookie: { httpOnly: true },
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// Static y views
app.use("/static", express.static("static"));
app.engine("html", cons.swig);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "html");

// OIDC router
app.use(oidc.router);

// Rutas
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/dashboard", (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect("/");
  }

  const token = req.session.passport.user.tokens.id_token;
  const payload = Buffer.from(token.split(".")[1], "base64").toString("utf-8");
  const userInfo = JSON.parse(payload);

  res.render("dashboard", { user: userInfo });
});

// Configurar timeout del cliente OpenID
Issuer.defaultHttpOptions = {
  timeout: 20000,
};

// Inicializar servidor cuando OIDC esté listo
oidc.on("ready", () => {
  console.log(`✅ Server running on port ${PORT}`);
  app.listen(parseInt(PORT));
});

oidc.on("error", (err) => {
  console.error("OIDC Error:", err);
});
