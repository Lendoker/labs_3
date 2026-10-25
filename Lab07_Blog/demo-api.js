// Живі HTTP-виклики до запущеного сервера блогу. Результат пишеться в output/api-demo.json.
const fs = require("fs");
const path = require("path");

const base = process.env.BLOG_URL || "http://127.0.0.1:3017";

async function call(name, method, url, body) {
  const started = Date.now();
  const response = await fetch(base + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch (error) { parsed = text.slice(0, 500); }
  return {
    name,
    method,
    url,
    status: response.status,
    cache: response.headers.get("x-cache"),
    ms: Date.now() - started,
    body: parsed
  };
}

function shrinkPost(post) {
  if (!post || typeof post !== "object") return post;
  return {
    id: post._id,
    title: post.title,
    author: post.author && post.author.username,
    category: post.category && post.category.name,
    city: post.location && post.location.city,
    tags: post.tags,
    views: post.statistics && post.statistics.views,
    likes: post.statistics && post.statistics.likes,
    dislikes: post.statistics && post.statistics.dislikes,
    comments: post.statistics && post.statistics.comments_count,
    distance_m: post.distance_m,
    score: post.score,
    version: post.version
  };
}

async function main() {
  const steps = [];
  steps.push(await call("health", "GET", "/api/health"));
  const page1 = await call("posts-page-1", "GET", "/api/posts?page=1&limit=6");
  steps.push({ ...page1, body: { page: page1.body.page, limit: page1.body.limit, total: page1.body.total, items: page1.body.items.map(shrinkPost) } });
  const page2 = await call("posts-page-2", "GET", "/api/posts?page=2&limit=6");
  steps.push({ ...page2, body: { page: page2.body.page, total: page2.body.total, first: page2.body.items[0] && page2.body.items[0].title } });
  const tags = await call("tags", "GET", "/api/posts?tags=mongodb,docker&limit=10");
  steps.push({ ...tags, body: { total: tags.body.total, titles: tags.body.items.map((p) => p.title) } });
  const search = await call("search", "GET", "/api/search?q=" + encodeURIComponent("коментарі Луцьку"));
  steps.push({ ...search, body: { query: search.body.query, normalized: search.body.normalized, count: search.body.count, titles: (search.body.items || []).slice(0, 3).map((p) => p.title) } });
  const near = await call("near", "GET", "/api/posts/near?lng=25.3254&lat=50.7472&meters=15000");
  const cities = {};
  for (const item of near.body.items || []) cities[item.location.city] = (cities[item.location.city] || 0) + 1;
  steps.push({ ...near, body: { count: near.body.count, cities, nearest: shrinkPost(near.body.items && near.body.items[0]) } });
  const cache1 = await call("cache-1", "GET", "/api/stats/top-authors");
  const cache2 = await call("cache-2", "GET", "/api/stats/top-authors");
  steps.push({ name: "cache", cache1: cache1.cache, ms1: cache1.ms, query_ms: cache1.body.query_ms, cache2: cache2.cache, ms2: cache2.ms, age_ms: cache2.body.age_ms, leader: cache2.body.data && cache2.body.data[0] });
  steps.push(await call("comment-stats", "GET", "/api/stats/comments"));
  const id = page1.body.items[0]._id;
  const before = await call("post-before", "GET", "/api/posts/" + id);
  const after = await call("post-after", "GET", "/api/posts/" + id);
  steps.push({
    name: "views",
    title: before.body.title,
    views_before: before.body.statistics.views,
    views_after: after.body.statistics.views,
    top_comment_status: before.body.comments[0].status,
    replies: before.body.comments[0].replies.length
  });
  steps.push(await call("like", "POST", "/api/posts/" + id + "/like", { username: "petro_ivanov" }));
  steps.push(await call("like-repeat", "POST", "/api/posts/" + id + "/like", { username: "petro_ivanov" }));
  const comment = await call("comment", "POST", "/api/posts/" + id + "/comments", { username: "lesia_fedchuk", text: "Перевірка модерації з форми API." });
  steps.push({ name: "comment", status: comment.status, comment_status: comment.body.status, comment_id: comment.body.comment_id });
  const parentId = before.body.comments[0].comment_id;
  const reply = await call("reply", "POST", `/api/posts/${id}/comments/${parentId}/replies`, { username: "roman_ostapuk", text: "Вкладена відповідь на перший коментар." });
  steps.push({ name: "reply", status: reply.status, reply_status: reply.body.status });
  const moderated = await call("moderate", "PATCH", `/api/posts/${id}/comments/${comment.body.comment_id}`, { status: "approved" });
  steps.push(moderated);
  const edited = await call("edit", "PUT", "/api/posts/" + id, {
    title: before.body.title + " (ред.)",
    content: before.body.content + " Доповнення після редагування зберігається в історії версій документа.",
    editor: "admin_lutsk"
  });
  steps.push({ name: "edit", status: edited.status, version: edited.body.version, history: (edited.body.edit_history || []).length });
  const notes = await call("notifications", "GET", "/api/notifications?username=" + encodeURIComponent(before.body.author.username));
  steps.push({ name: "notifications", status: notes.status, unread: notes.body.unread, latest: notes.body.items && notes.body.items[0] && notes.body.items[0].message });
  const created = await call("create", "POST", "/api/posts", {
    title: "Нотатка з вебформи",
    content: "Цей пост створено через REST API під час перевірки лабораторної роботи. Текст навмисно довший за сто символів, щоб пройти JSON Schema колекції posts і з’явитися у стрічці блогу.",
    author: "ivan_koval",
    category: "databases",
    tags: "mongodb,lutsk",
    city: "Луцьк",
    lng: 25.3254,
    lat: 50.7472
  });
  steps.push(created);
  const health2 = await call("health-after", "GET", "/api/health");
  steps.push({ name: "health-after", posts: health2.body.posts, users: health2.body.users, categories: health2.body.categories });
  const bad = await call("validation-http", "POST", "/api/posts", { title: "x", content: "коротко", author: "ivan_koval", category: "databases" });
  steps.push({ name: "validation-http", status: bad.status, error: bad.body.error });

  const out = { base, steps };
  fs.writeFileSync(path.join(__dirname, "output", "api-demo.json"), JSON.stringify(out, null, 2), "utf8");
  for (const step of steps) {
    console.log(step.name, step.status || "", step.cache || step.cache1 || "", JSON.stringify(step.body || step).slice(0, 220));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
