async function test() {
  const res = await fetch("http://127.0.0.1:4000/api/execute", {
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
