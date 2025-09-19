import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

const CLIENT_ID = "930795945675-2vpr0r2i1l9vo40i2lg9fngmr1380nis.apps.googleusercontent.com";
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
