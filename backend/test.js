const fetch = require('node-fetch');
async function test() {
  const res = await fetch("http://localhost:4000/api/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      language: "javascript",
      code: "console.log(1);"
    })
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
