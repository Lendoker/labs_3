// Лабораторна робота 06. Ініціалізація replica set rs0.
// Пінкевич Артем Романович, ІПЗ-32, Луцьк, 2026.
try {
  const status = rs.status();
  print("ALREADY_INITIALIZED myState=" + status.myState + " set=" + status.set);
} catch (e) {
  const result = rs.initiate({
    _id: "rs0",
    members: [
      { _id: 0, host: "library-mongo:27017", priority: 2 },
      { _id: 1, host: "library-mongo-2:27017", priority: 1 },
      { _id: 2, host: "library-mongo-3:27017", priority: 1 }
    ]
  });
  print("INITIATE ok=" + result.ok);
}
