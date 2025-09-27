import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

const CLIENT_ID = "804630636275-8i276ocltjm67hrdmdn81ijmbi7musbm.apps.googleusercontent.com";
const CLIENT_SECRET = "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";

app.post("/verify-token", async (req, res) => {
  const token = req.body.token;

  try {
    // Exchange token with Google
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const data = await googleRes.json();

    if (data.aud !== CLIENT_ID) {
      return res.json({ success: false, message: "Invalid Client ID" });
    }

    res.json({
      success: true,
      user: {
        name: data.name,
        email: data.email,
        picture: data.picture
      }
    });
  } catch (err) {
    res.json({ success: false, message: "Verification failed" });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
