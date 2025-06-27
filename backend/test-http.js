const http = require("http");

// Test the debug endpoint
const testDebugEndpoint = () => {
  const postData = JSON.stringify({
    0: {
      json: null,
      meta: {
        values: {},
      },
    },
  });

  const options = {
    hostname: "localhost",
    port: 5000,
    path: "/trpc/bots.debugAuth?batch=1&input=" + encodeURIComponent('{"0":{"json":null}}'),
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-token-123",
    },
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log("Response:", data);
    });
  });

  req.on("error", (e) => {
    console.error(`Request error: ${e.message}`);
  });

  req.end();
};

console.log("Testing HTTP endpoint...");
testDebugEndpoint();
