// Calls the API through the Nginx proxy and shows the answer on the page.
const output = document.getElementById("api-response");

fetch("/api/hello")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  })
  .then((body) => {
    output.textContent = JSON.stringify(body, null, 2);
  })
  .catch((error) => {
    output.textContent = `The API did not answer: ${error.message}`;
  });
