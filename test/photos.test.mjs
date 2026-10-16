import test from "node:test";
import assert from "node:assert/strict";
import { photoUrl, parsePhotos, fetchPhoto } from "../lib/photos.mjs";

const source = "https://talk.kakaocdn.net/fictional/photo.jpg";
const thumbnail = "https://talk.kakaocdn.net/fictional/thumbnail.jpg";
const jpeg = Buffer.from("ffd8ffe000104a464946", "hex");

test("single photos and albums preserve thumbnail/original pairing", () => {
  assert.deepEqual(parsePhotos(JSON.stringify({ url: source, thumbnailUrl: thumbnail })),
    [{ original: source, preview: thumbnail }]);
  assert.deepEqual(parsePhotos({ imageUrls: [source, source + "?second"], thumbnailUrls: [thumbnail] }),
    [{ original: source, preview: thumbnail }, { original: source + "?second", preview: source + "?second" }]);
  assert.deepEqual(parsePhotos("broken JSON"), []);
  assert.deepEqual(parsePhotos(null), []);
  assert.equal(parsePhotos({ imageUrls: Array(100).fill(source) }).length, 30);
});
test("photo URLs reject foreign hosts, credentials, ports and non-HTTPS schemes", () => {
  const credentials = new URL(source);
  credentials.username = "fixture";
  credentials.password = "fixture";
  for (const value of [
    "http://talk.kakaocdn.net/image", "https://127.0.0.1/image", "file:///tmp/image",
    "https://talk.kakaocdn.net.evil.example/image", "https://evil.example/?url=" + source,
    credentials.href, "https://talk.kakaocdn.net:8080/image",
    "data:image/png;base64,AA==", {}, null,
  ]) {
    assert.equal(photoUrl(value), null);
    assert.deepEqual(parsePhotos({ url: value }), []);
  }
  assert.equal(photoUrl(source), source);
});
test("photo fetch disables redirects and verifies file bytes instead of content-type", async () => {
  const result = await fetchPhoto(source, async (url, options) => {
    assert.equal(url, source);
    assert.equal(options.redirect, "error");
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(jpeg, { headers: { "Content-Type": "text/plain" } });
  });
  assert.equal(result.type, "image/jpeg");
  assert.deepEqual(result.bytes, jpeg);
  for (const body of ["<html>login</html>", '<svg xmlns="http://www.w3.org/2000/svg"></svg>']) {
    await assert.rejects(fetchPhoto(source, async () => new Response(body,
      { headers: { "Content-Type": "image/jpeg" } })), /Unsupported photo format/);
  }
});
test("expired responses and oversized declared or streamed images are rejected", async () => {
  await assert.rejects(fetchPhoto(source, async () => new Response("", { status: 404 })));
  await assert.rejects(fetchPhoto(source, async () => new Response(jpeg,
    { headers: { "Content-Length": String(21 * 1024 * 1024) } })));
  await assert.rejects(fetchPhoto(source, async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(21 * 1024 * 1024)); controller.close(); },
  }))), /too large/);
  let called = false;
  await assert.rejects(fetchPhoto("https://localhost/image", async () => { called = true; }));
  assert.equal(called, false);
});
