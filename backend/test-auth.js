const jwt = require("jsonwebtoken");
const base64url = require("base64url");

// Sample Clerk token (this would be replaced with a real token)
const sampleToken =
  "eyJhbGciOiJSUzI1NiIsImtpZCI6Imluc18yampqYnlMR1VxYWExNzJHRXZQd1hkbWJIZnAiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJleHAiOjE3MzUyMTczMjIsImlhdCI6MTczNTIxNzI2MiwiaXNzIjoiaHR0cHM6Ly93aXR0eS1tYXN0b2Rvbi0zLmNsZXJrLmFjY291bnRzLmRldiIsIm5iZiI6MTczNTIxNzI1Miwic2lkIjoic2Vzc18ycXF4MFJGNFJSaDB6ZmZaOTVzVzN6d3BnQUIiLCJzdWIiOiJ1c2VyXzJxcXhBSzZZT2ZzN0RtSUxsZlYzb3BLUktyTiJ9.example";

console.log("Testing JWT token decoding...");

// Test 1: Try jsonwebtoken.decode
try {
  const decoded1 = jwt.decode(sampleToken);
  console.log("jwt.decode success:", {
    sub: decoded1?.sub,
    iss: decoded1?.iss,
    exp: decoded1?.exp,
    azp: decoded1?.azp,
  });
} catch (error) {
  console.log("jwt.decode failed:", error.message);
}

// Test 2: Try manual base64url decoding
try {
  const tokenParts = sampleToken.split(".");
  if (tokenParts.length === 3) {
    const header = JSON.parse(base64url.decode(tokenParts[0]));
    const payload = JSON.parse(base64url.decode(tokenParts[1]));

    console.log("Manual decode success:");
    console.log("Header:", header);
    console.log("Payload:", {
      sub: payload?.sub,
      iss: payload?.iss,
      exp: payload?.exp,
      azp: payload?.azp,
    });
  }
} catch (error) {
  console.log("Manual decode failed:", error.message);
}

console.log("Test completed.");
