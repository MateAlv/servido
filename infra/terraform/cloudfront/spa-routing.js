// Single-page app routing: paths without a file extension (/, /diseno, /reservas/12)
// get index.html, and React Router takes it from there. Only the frontend behavior uses it.
function handler(event) {
  var request = event.request;
  if (request.uri.indexOf('.') === -1) {
    request.uri = '/index.html';
  }
  return request;
}
