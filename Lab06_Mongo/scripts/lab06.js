// Лабораторна робота 06. База library у MongoDB 7.
// Пінкевич Артем Романович, група ІПЗ-32, Луцьк, 2026.
// Скрипт розрахований на mongosh. Повторний запуск очищає лише базу library.

const ENDINGS = ["оями", "ями", "ами", "ого", "ому", "ої", "ій", "ий", "ою", "ах", "ів", "ам", "ях", "ом", "ем", "ю", "я", "а", "у", "і", "и", "е", "о"];

function stemWord(word) {
  const w = String(word || "").toLowerCase().replace(/['’`]/g, "");
  if (w.length < 5) return w;
  const sorted = ENDINGS.slice().sort((a, b) => b.length - a.length);
  for (const e of sorted) {
    if (w.endsWith(e) && w.length - e.length >= 4) return w.slice(0, -e.length);
  }
  return w;
}

function ukTokens(text) {
  const words = String(text || "")
    .toLowerCase()
    .split(/[^a-zа-яіїєґ0-9]+/)
    .filter((w) => w.length > 2);
  return Array.from(new Set(words.map(stemWord)));
}

function shot(name) {
  print("##### SHOT " + name + " #####");
}

function endShot(name) {
  print("##### END " + name + " #####");
}

function explainSummary(label, exp) {
  const stages = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.stage) stages.push(node.stage + (node.indexName ? "(" + node.indexName + ")" : ""));
    if (node.inputStage) walk(node.inputStage);
    if (Array.isArray(node.inputStages)) node.inputStages.forEach(walk);
  }
  walk(exp.queryPlanner && exp.queryPlanner.winningPlan);
  walk(exp.executionStats && exp.executionStats.executionStages);
  const es = exp.executionStats || {};
  print(label);
  print("  plan: " + stages.filter((v, i, a) => a.indexOf(v) === i).join(" -> "));
  print("  nReturned: " + es.nReturned);
  print("  totalDocsExamined: " + es.totalDocsExamined);
  print("  totalKeysExamined: " + es.totalKeysExamined);
  print("  executionTimeMillis: " + es.executionTimeMillis);
}

function timed(label, times, fn) {
  const t0 = Date.now();
  for (let i = 0; i < times; i++) fn();
  print(label + ": " + (Date.now() - t0) + " ms / " + times + " runs");
}

function nInserted(result) {
  if (!result) return 0;
  if (typeof result.insertedCount === "number") return result.insertedCount;
  if (result.insertedIds) return Object.keys(result.insertedIds).length;
  return 0;
}

function bookLine(b) {
  const genres = (b.genres || []).join(", ");
  const branch = b.location && b.location.branch ? b.location.branch : "-";
  return b.title + " | " + b.author + " | " + b.publication_year + " | " + b.pages + " с. | " + (b.available ? "доступна" : "видана") + " | " + genres + " | " + branch;
}

const hello = db.hello();
shot("version");
print("executed_at: " + new Date().toISOString());
print("mongodb: " + db.version());
print("db: " + db.getName());
print("me: " + hello.me);
print("setName: " + hello.setName);
print("isWritablePrimary: " + hello.isWritablePrimary);
print("hosts: " + (hello.hosts || []).join(", "));
endShot("version");

if (!hello.isWritablePrimary) {
  throw new Error("Вузол не є PRIMARY: " + hello.me);
}

db.dropDatabase();

db.createCollection("books", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "author", "publication_year", "available"],
      properties: {
        title: { bsonType: "string", minLength: 1, maxLength: 200 },
        author: { bsonType: "string", minLength: 1 },
        publication_year: { bsonType: "int", minimum: 1000, maximum: 2100 },
        pages: { bsonType: "int", minimum: 1, maximum: 10000 },
        isbn: { bsonType: "string", pattern: "^978-\\d{1,5}-\\d{1,7}-\\d{1,7}-\\d{1}$" },
        genres: { bsonType: "array", items: { bsonType: "string" } },
        available: { bsonType: "bool" },
        description: { bsonType: "string" },
        ratings: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["user", "score"],
            properties: {
              user: { bsonType: "string" },
              score: { bsonType: "int", minimum: 1, maximum: 5 },
              date: { bsonType: "date" }
            }
          }
        },
        location: {
          bsonType: "object",
          required: ["type", "coordinates", "branch"],
          properties: {
            type: { enum: ["Point"] },
            coordinates: { bsonType: "array", minItems: 2, maxItems: 2 },
            branch: { bsonType: "string" }
          }
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

db.createCollection("authors", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "birth_year", "nationality", "biography"],
      properties: {
        name: { bsonType: "string", minLength: 3 },
        birth_year: { bsonType: "int", minimum: 1000, maximum: 2100 },
        death_year: { bsonType: "int", minimum: 1000, maximum: 2100 },
        nationality: { bsonType: "string" },
        biography: { bsonType: "string" },
        genres: { bsonType: "array", items: { bsonType: "string" } },
        notable_works: { bsonType: "array", items: { bsonType: "string" } },
        contact: {
          bsonType: "object",
          properties: {
            city: { bsonType: "string" },
            country: { bsonType: "string" }
          }
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "email", "registration_date", "status", "borrowed_books", "profile"],
      properties: {
        username: { bsonType: "string", minLength: 3, maxLength: 40 },
        email: { bsonType: "string", pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" },
        registration_date: { bsonType: "date" },
        status: { enum: ["active", "suspended"] },
        borrowed_books: { bsonType: "array", items: { bsonType: "string" } },
        profile: {
          bsonType: "object",
          required: ["full_name", "city"],
          properties: {
            full_name: { bsonType: "string" },
            city: { bsonType: "string" },
            group: { bsonType: "string" }
          }
        },
        address: {
          bsonType: "object",
          properties: {
            street: { bsonType: "string" },
            geo: { bsonType: "object" }
          }
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

db.createCollection("book_history");

const authors = [
  ["Тарас Шевченко", 1814, 1861, "Поет, письменник і художник", "Моринці", ["поезія", "проза"], ["Кобзар", "Гайдамаки"]],
  ["Леся Українка", 1871, 1913, "Поетеса, драматургиня", "Звягель", ["драма", "поезія"], ["Лісова пісня", "Contra spem spero"]],
  ["Іван Франко", 1856, 1916, "Письменник, поет, перекладач", "Нагуєвичі", ["роман", "поезія"], ["Захар Беркут", "Каменярі"]],
  ["Михайло Коцюбинський", 1864, 1913, "Письменник-модерніст", "Вінниця", ["повість", "новела"], ["Тіні забутих предків", "Intermezzo"]],
  ["Панас Мирний", 1849, 1920, "Письменник-реаліст", "Миргород", ["роман"], ["Хіба ревуть воли, як ясла повні"]],
  ["Григорій Квітка-Основ'яненко", 1778, 1843, "Засновник новітньої української прози", "Харків", ["повість"], ["Конотопська відьма", "Маруся"]],
  ["Василь Стефаник", 1871, 1936, "Новеліст, майстер малої прози", "Русів", ["новела"], ["Камінний хрест"]],
  ["Іван Нечуй-Левицький", 1838, 1918, "Прозаїк-реаліст", "Стеблів", ["повість", "роман"], ["Кайдашева сім'я"]],
  ["Ольга Кобилянська", 1863, 1942, "Письменниця-модерністка", "Гура-Гумора", ["повість"], ["Земля", "Valse mélancolique"]],
  ["Марко Вовчок", 1833, 1907, "Письменниця, перекладачка", "Єкатерининське", ["повість"], ["Інститутка", "Народні оповідання"]]
].map((row) => ({
  name: row[0],
  birth_year: NumberInt(row[1]),
  death_year: NumberInt(row[2]),
  nationality: "український",
  biography: row[3],
  contact: { city: row[4], country: "Україна" },
  genres: row[5],
  notable_works: row[6]
}));

const authorInsert = db.authors.insertMany(authors);
print("authors_inserted: " + nInserted(authorInsert));

function book(title, author, year, pages, isbn, genres, available, description, branch, coordinates) {
  return {
    title,
    author,
    publication_year: NumberInt(year),
    pages: NumberInt(pages),
    isbn,
    genres,
    available,
    description,
    ratings: [],
    borrowed_count: NumberInt(0),
    version: NumberInt(1),
    location: { type: "Point", coordinates, branch }
  };
}

const books = [
  book("Кобзар", "Тарас Шевченко", 1840, 238, "978-966-03-4421-6", ["поезія", "романтизм"], true, "Збірка віршів Тараса Шевченка", "Центральна бібліотека Луцька", [25.3254, 50.7472]),
  book("Лісова пісня", "Леся Українка", 1911, 128, "978-966-03-3918-2", ["драма", "феєрія", "романтизм"], true, "Драма-феєрія за мотивами українського фольклору", "Бібліотека на проспекті Волі", [25.338, 50.752]),
  book("Захар Беркут", "Іван Франко", 1883, 256, "978-966-03-6127-5", ["роман", "історична проза"], false, "Історичний роман про боротьбу карпатських горян", "Бібліотека на вулиці Винниченка", [25.312, 50.741]),
  book("Тіні забутих предків", "Михайло Коцюбинський", 1911, 96, "978-966-03-5214-3", ["повість", "романтизм", "модернізм"], true, "Поетична повість про кохання в Карпатах", "Бібліотека на проспекті Соборності", [25.351, 50.76]),
  book("Хіба ревуть воли, як ясла повні", "Панас Мирний", 1880, 384, "978-966-03-4856-6", ["роман", "реалізм"], true, "Соціально-побутовий роман про життя селян", "Бібліотека на вулиці Ковельській", [25.3, 50.735]),
  book("Каменярі", "Іван Франко", 1878, 64, "978-966-03-7841-9", ["поезія", "реалізм"], true, "Збірка соціальної поезії", "Читальня у Ковелі", [24.7086, 51.2036]),
  book("Конотопська відьма", "Григорій Квітка-Основ'яненко", 1837, 112, "978-966-03-3762-1", ["повість", "містика"], true, "Перша українська романтична повість", "Центральна бібліотека Луцька", [25.328, 50.749]),
  book("Маруся", "Григорій Квітка-Основ'яненко", 1834, 96, "978-966-03-4125-3", ["повість", "сентименталізм"], false, "Сентиментальна повість про нещасливе кохання", "Бібліотека на вулиці Винниченка", [25.316, 50.744]),
  book("Камінний хрест", "Василь Стефаник", 1900, 48, "978-966-03-5427-7", ["новела", "реалізм"], true, "Збірка новел про важке життя селян", "Бібліотека на проспекті Волі", [25.341, 50.7505]),
  book("Intermezzo", "Михайло Коцюбинський", 1909, 72, "978-966-03-6843-4", ["повість", "імпресіонізм"], true, "Імпресіоністична повість про кохання і природу", "Філія у Рівному", [26.2516, 50.6199])
];

const nine = books.slice(0, 9);
const one = books[9];
const manyBooks = db.books.insertMany(nine);
const oneBook = db.books.insertOne(one);

function user(username, email, date, status, borrowed, fullName, group, street, coordinates) {
  return {
    username,
    email,
    registration_date: ISODate(date),
    status,
    borrowed_books: borrowed,
    profile: { full_name: fullName, city: "Луцьк", group },
    address: { street, geo: { type: "Point", coordinates } }
  };
}

const users = [
  user("ivan_petrov", "ivan.petrov@email.com", "2024-01-15", "active", ["Кобзар", "Тіні забутих предків"], "Іван Петров", "ІПЗ-32", "вул. Винниченка, 10", [25.322, 50.746]),
  user("maria_kovalenko", "maria.kovalenko@email.com", "2024-02-20", "active", ["Лісова пісня"], "Марія Коваленко", "ІПЗ-32", "пр. Волі, 8", [25.336, 50.751]),
  user("oleksandr_sydorov", "alex.sydorov@email.com", "2024-03-10", "active", [], "Олександр Сидоров", "ІПЗ-31", "вул. Кривий Вал, 3", [25.319, 50.743]),
  user("anna_melnyk", "anna.melnyk@email.com", "2023-11-05", "active", ["Хіба ревуть воли, як ясла повні"], "Анна Мельник", "ІПЗ-32", "вул. Лесі Українки, 15", [25.329, 50.748]),
  user("dmytro_bondar", "dmytro.bondar@email.com", "2024-01-28", "suspended", ["Захар Беркут", "Каменярі"], "Дмитро Бондар", "КН-21", "вул. Богдана Хмельницького, 4", [25.331, 50.745]),
  user("oksana_shevchuk", "oksana.shevchuk@email.com", "2025-09-01", "active", ["Камінний хрест"], "Оксана Шевчук", "ІПЗ-33", "вул. Шопена, 12", [25.34, 50.753]),
  user("petro_savchuk", "petro.savchuk@email.com", "2025-10-12", "active", ["Intermezzo"], "Петро Савчук", "ІПЗ-32", "вул. Глушець, 7", [25.314, 50.739]),
  user("natalia_lysenko", "natalia.lysenko@email.com", "2026-02-11", "active", ["Маруся"], "Наталія Лисенко", "ІПЗ-34", "вул. Дубнівська, 21", [25.348, 50.756]),
  user("vasyl_tkach", "vasyl.tkach@email.com", "2026-03-02", "active", ["Каменярі", "Конотопська відьма"], "Василь Ткач", "ІПЗ-32", "вул. Ковельська, 18", [25.305, 50.736])
];
const manyUsers = db.users.insertMany(users);
const oneUser = db.users.insertOne(user("iryna_moroz", "iryna.moroz@email.com", "2026-04-18", "active", [], "Ірина Мороз", "ІПЗ-32", "вул. Ярощука, 5", [25.327, 50.7502]));

shot("counts");
print("authors.insertMany: " + nInserted(authorInsert));
print("books.insertMany: " + nInserted(manyBooks));
print("books.insertOne Intermezzo: " + oneBook.insertedId);
print("users.insertMany: " + nInserted(manyUsers));
print("users.insertOne iryna_moroz: " + oneUser.insertedId);
print("counts books=" + db.books.countDocuments() + " authors=" + db.authors.countDocuments() + " users=" + db.users.countDocuments());
print("authors: " + db.authors.find().map((a) => a.name).toArray().join("; "));
db.books.find({}, { title: 1, author: 1, publication_year: 1, pages: 1, available: 1, genres: 1, "location.branch": 1, _id: 0 }).forEach((b) => print(bookLine(b)));
printjson(db.authors.findOne({ name: "Леся Українка" }, { _id: 0 }));
printjson(db.users.findOne({ username: "ivan_petrov" }, { _id: 0, email: 1, status: 1, borrowed_books: 1, profile: 1, address: 1 }));
endShot("counts");

shot("crud");
const eq = db.books.find({ author: "Іван Франко" }, { title: 1, publication_year: 1, _id: 0 }).toArray();
print("equality author=Іван Франко: " + eq.length);
eq.forEach((b) => print("  " + b.title + " (" + b.publication_year + ")"));

const cmp = db.books.find({ pages: { $gt: 100 } }, { title: 1, pages: 1, _id: 0 }).sort({ pages: -1 }).toArray();
print("comparison pages>100: " + cmp.length);
cmp.forEach((b) => print("  " + b.title + " - " + b.pages));

const projected = db.books.find({ available: true }, { title: 1, author: 1, _id: 0 }).sort({ title: 1 }).toArray();
print("projection available title+author: " + projected.length);
projected.forEach((b) => print("  " + b.title + " / " + b.author));

const newest = db.books.find({}, { title: 1, publication_year: 1, _id: 0 }).sort({ publication_year: -1 }).limit(5).toArray();
print("sort+limit 5 newest:");
newest.forEach((b) => print("  " + b.publication_year + " " + b.title));

const oneFound = db.books.findOne({ title: "Кобзар" }, { title: 1, available: 1, version: 1, _id: 0 });
print("findOne Кобзар before update: " + JSON.stringify(oneFound));

const updOne = db.books.updateOne({ title: "Кобзар" }, { $set: { available: false } });
print("updateOne Кобзар available=false matched=" + updOne.matchedCount + " modified=" + updOne.modifiedCount);

const pushR = db.books.updateOne(
  { title: "Лісова пісня" },
  { $push: { ratings: { user: "ivan_petrov", score: NumberInt(5), date: new Date() } } }
);
print("push rating Лісова пісня modified=" + pushR.modifiedCount);

const updMany = db.books.updateMany(
  { publication_year: { $lt: 1900 } },
  { $set: { category: "класика XIX століття" } }
);
print("updateMany year<1900 matched=" + updMany.matchedCount + " modified=" + updMany.modifiedCount);

const incR = db.books.updateOne({ title: "Тіні забутих предків" }, { $inc: { borrowed_count: 1 } });
print("inc borrowed_count Тіні modified=" + incR.modifiedCount);

db.books.updateOne({ title: "Захар Беркут" }, { $set: { temporary_note: "тимчасова позначка" } });
const unsetR = db.books.updateOne({ title: "Захар Беркут" }, { $unset: { temporary_note: "" } });
print("unset temporary_note modified=" + unsetR.modifiedCount);
print("note still present: " + (db.books.findOne({ title: "Захар Беркут" }).temporary_note !== undefined));

const tempBook = {
  title: "Тимчасовий довідник",
  author: "Тестовий автор",
  publication_year: NumberInt(2001),
  pages: NumberInt(40),
  isbn: "978-966-00-0001-1",
  genres: ["довідник"],
  available: false,
  description: "Документ для демонстрації replaceOne і delete",
  ratings: [],
  borrowed_count: NumberInt(0),
  version: NumberInt(1),
  location: { type: "Point", coordinates: [25.3254, 50.7472], branch: "Центральна бібліотека Луцька" },
  temp: true
};
const tempIns = db.books.insertOne(tempBook);
print("temp insertOne: " + tempIns.insertedId);
const replaced = db.books.replaceOne(
  { _id: tempIns.insertedId },
  {
    title: "Тимчасовий довідник",
    author: "Тестовий автор",
    publication_year: NumberInt(2001),
    pages: NumberInt(41),
    isbn: "978-966-00-0001-1",
    genres: ["довідник"],
    available: false,
    description: "Повністю замінений тимчасовий документ",
    ratings: [],
    borrowed_count: NumberInt(0),
    version: NumberInt(1),
    location: { type: "Point", coordinates: [25.3254, 50.7472], branch: "Центральна бібліотека Луцька" },
    temp: true
  }
);
print("replaceOne matched=" + replaced.matchedCount + " modified=" + replaced.modifiedCount);

const tempMany = db.books.insertMany([
  Object.assign({}, tempBook, { title: "Тимчасова книга 1", isbn: "978-966-00-0002-2" }),
  Object.assign({}, tempBook, { title: "Тимчасова книга 2", isbn: "978-966-00-0003-3" })
]);
print("temp insertMany: " + nInserted(tempMany));
const delMany = db.books.deleteMany({ temp: true, available: false });
print("deleteMany temp: " + delMany.deletedCount);

const tempAuthor = db.authors.insertOne({
  name: "Тимчасовий Автор",
  birth_year: NumberInt(1900),
  death_year: NumberInt(1950),
  nationality: "український",
  biography: "Документ для deleteOne",
  contact: { city: "Луцьк", country: "Україна" },
  genres: ["довідник"],
  notable_works: [],
  temp: true
});
print("temp author: " + tempAuthor.insertedId);
print("deleteOne author: " + db.authors.deleteOne({ temp: true }).deletedCount);

const tempUser = db.users.insertOne(user("old_user", "old.user@email.com", "2020-01-01", "suspended", [], "Старий Користувач", "архів", "вул. Архівна, 1", [25.32, 50.74]));
print("temp user: " + tempUser.insertedId);
print("deleteOne suspended old_user: " + db.users.deleteOne({ username: "old_user", status: "suspended" }).deletedCount);

const after = db.books.findOne({ title: "Кобзар" }, { title: 1, available: 1, category: 1, _id: 0 });
const forest = db.books.findOne({ title: "Лісова пісня" }, { title: 1, ratings: 1, _id: 0 });
const shadows = db.books.findOne({ title: "Тіні забутих предків" }, { title: 1, borrowed_count: 1, _id: 0 });
print("after Кобзар: " + JSON.stringify(after));
print("after Лісова пісня ratings: " + forest.ratings.length + " score=" + forest.ratings[0].score);
print("after Тіні borrowed_count: " + shadows.borrowed_count);
print("final counts books=" + db.books.countDocuments() + " authors=" + db.authors.countDocuments() + " users=" + db.users.countDocuments());
endShot("crud");

shot("explain");
print("--- books.author до індексу ---");
explainSummary("books author before", db.books.find({ author: "Іван Франко" }).explain("executionStats"));

print("--- books_bench 15000 документів ---");
const benchDocs = [];
for (let i = 0; i < 15000; i++) {
  benchDocs.push({
    author: i % 100 === 0 ? "Іван Франко" : "Автор " + (i % 100),
    title: "Bench " + i,
    n: NumberInt(i)
  });
}
db.books_bench.insertMany(benchDocs, { ordered: false });
print("bench count: " + db.books_bench.countDocuments());
explainSummary("bench before index", db.books_bench.find({ author: "Іван Франко" }).explain("executionStats"));
timed("bench find before index", 30, () => db.books_bench.find({ author: "Іван Франко" }).toArray());

const authorIdx = db.books.createIndex({ author: 1 }, { name: "author_1" });
const titleIdx = db.books.createIndex({ title: 1 }, { name: "title_1" });
const isbnIdx = db.books.createIndex({ isbn: 1 }, { name: "isbn_1", unique: true });
print("created indexes: " + [authorIdx, titleIdx, isbnIdx].join(", "));
explainSummary("books author after author_1", db.books.find({ author: "Іван Франко" }).explain("executionStats"));

const benchIdx = db.books_bench.createIndex({ author: 1 }, { name: "author_1" });
print("bench index: " + benchIdx);
explainSummary("bench after index", db.books_bench.find({ author: "Іван Франко" }).explain("executionStats"));
timed("bench find after index", 30, () => db.books_bench.find({ author: "Іван Франко" }).toArray());
db.books_bench.drop();
print("bench dropped, exists=" + (db.getCollectionNames().indexOf("books_bench") !== -1));
endShot("explain");

shot("queryops");
const andRes = db.books.find({
  $and: [
    { publication_year: { $gte: 1800 } },
    { pages: { $gt: 100 } },
    { available: true }
  ]
}, { title: 1, pages: 1, publication_year: 1, _id: 0 }).toArray();
print("$and year>=1800, pages>100, available: " + andRes.length);
andRes.forEach((b) => print("  " + b.title + " | " + b.publication_year + " | " + b.pages));

const orRes = db.books.find({
  $or: [{ author: "Тарас Шевченко" }, { genres: "поезія" }]
}, { title: 1, author: 1, _id: 0 }).toArray();
print("$or Шевченко або жанр поезія: " + orRes.length);
orRes.forEach((b) => print("  " + b.title + " / " + b.author));

const inRes = db.books.find(
  { genres: { $in: ["драма", "новела"] } },
  { title: 1, genres: 1, _id: 0 }
).toArray();
print("$in genres драма|новела: " + inRes.length);
inRes.forEach((b) => print("  " + b.title + " [" + b.genres.join(", ") + "]"));

const reRes = db.books.find(
  { title: { $regex: /пісня|хрест/i } },
  { title: 1, _id: 0 }
).toArray();
print("$regex /пісня|хрест/i: " + reRes.length);
reRes.forEach((b) => print("  " + b.title));
endShot("queryops");

shot("aggregate");
print("genres count:");
db.books.aggregate([
  { $unwind: "$genres" },
  { $group: { _id: "$genres", count: { $sum: 1 } } },
  { $sort: { count: -1, _id: 1 } }
]).forEach((row) => print("  " + row._id + ": " + row.count));

print("avg pages by author:");
db.books.aggregate([
  { $group: { _id: "$author", avg_pages: { $avg: "$pages" }, total_books: { $sum: 1 } } },
  { $sort: { avg_pages: -1, _id: 1 } },
  { $project: { _id: 0, author: "$_id", total_books: 1, avg_pages: { $round: ["$avg_pages", 1] } } }
]).forEach((row) => print("  " + row.author + ": books=" + row.total_books + " avg_pages=" + row.avg_pages));

print("by century:");
db.books.aggregate([
  { $project: { title: 1, author: 1, century: { $ceil: { $divide: ["$publication_year", 100] } } } },
  { $group: { _id: "$century", books_count: { $sum: 1 }, authors: { $addToSet: "$author" } } },
  { $sort: { _id: 1 } }
]).forEach((row) => print("  century " + row._id + ": books=" + row.books_count + " authors=" + row.authors.length));

print("top users by borrowed books:");
db.users.aggregate([
  { $project: { username: 1, status: 1, borrowed_count: { $size: "$borrowed_books" } } },
  { $sort: { borrowed_count: -1, username: 1 } },
  { $limit: 5 }
]).forEach((row) => print("  " + row.username + " (" + row.status + "): " + row.borrowed_count));
endShot("aggregate");

shot("lookup");
const compound = db.books.createIndex({ author: 1, publication_year: -1 }, { name: "author_1_publication_year_-1" });
print("compound index: " + compound);
explainSummary(
  "compound query",
  db.books.find({ author: "Іван Франко", publication_year: { $gte: 1800 } }).explain("executionStats")
);
explainSummary(
  "compound query hinted",
  db.books.find({ author: "Іван Франко", publication_year: { $gte: 1800 } }).hint("author_1_publication_year_-1").explain("executionStats")
);

db.authors.find().forEach((author) => {
  db.books.updateMany({ author: author.name }, { $set: { author_id: author._id } });
});
print("books with author_id: " + db.books.countDocuments({ author_id: { $exists: true } }));

print("lookup sample:");
db.books.aggregate([
  { $lookup: { from: "authors", localField: "author_id", foreignField: "_id", as: "author_details" } },
  { $unwind: "$author_details" },
  { $project: { _id: 0, title: 1, publication_year: 1, "author_details.name": 1, "author_details.birth_year": 1, "author_details.contact.city": 1 } },
  { $sort: { publication_year: 1, title: 1 } },
  { $limit: 4 }
]).forEach((row) => print("  " + row.title + " | " + row.author_details.name + " | " + row.author_details.birth_year + " | " + row.author_details.contact.city));

db.createView("available_books", "books", [
  { $match: { available: true } },
  { $project: { title: 1, author: 1, publication_year: 1, pages: 1, "location.branch": 1 } }
]);
db.createView("books_with_authors", "books", [
  { $lookup: { from: "authors", localField: "author_id", foreignField: "_id", as: "author_details" } },
  { $unwind: "$author_details" },
  { $project: { title: 1, publication_year: 1, "author_details.name": 1, "author_details.birth_year": 1 } }
]);
print("view available_books: " + db.available_books.countDocuments());
print("view available before 1900:");
db.available_books.find({ publication_year: { $lt: 1900 } }, { title: 1, author: 1, publication_year: 1, _id: 0 }).forEach((b) => print("  " + b.publication_year + " " + b.title));
print("view books_with_authors: " + db.books_with_authors.countDocuments());
endShot("lookup");

shot("textsearch");
db.books.find().forEach((b) => {
  db.books.updateOne(
    { _id: b._id },
    { $set: { uk_tokens: ukTokens([b.title, b.description, (b.genres || []).join(" ")].join(" ")) } }
  );
});
const textIdx = db.books.createIndex(
  { title: "text", description: "text", uk_tokens: "text" },
  { name: "books_text", default_language: "none", language_override: "text_lang", weights: { title: 10, description: 5, uk_tokens: 3 } }
);
print("text index: " + textIdx);

function showText(label, query) {
  const rows = db.books.find(
    { $text: { $search: query } },
    { title: 1, score: { $meta: "textScore" }, _id: 0 }
  ).sort({ score: { $meta: "textScore" } }).toArray();
  print(label + " query=[" + query + "] hits=" + rows.length);
  rows.forEach((row) => print("  " + row.title + " score=" + row.score.toFixed(4)));
}

showText("exact кохання", "кохання");
showText("exact Карпатах", "Карпатах");
showText("exact Карпати (без стемінгу)", "Карпати");
showText("stemmed Карпати кохання", ukTokens("Карпати кохання").join(" "));
const tokenSample = db.books.findOne({ title: "Тіні забутих предків" }, { title: 1, uk_tokens: 1, _id: 0 });
print("tokens Тіні: " + tokenSample.uk_tokens.join(" "));
endShot("textsearch");

shot("validation");
const collMod = db.runCommand({
  collMod: "books",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "author", "publication_year", "available", "isbn"],
      properties: {
        title: { bsonType: "string", minLength: 1, maxLength: 200 },
        author: { bsonType: "string", minLength: 1 },
        publication_year: { bsonType: "int", minimum: 1000, maximum: 2100 },
        pages: { bsonType: "int", minimum: 1, maximum: 10000 },
        isbn: { bsonType: "string", pattern: "^978-\\d{1,5}-\\d{1,7}-\\d{1,7}-\\d{1}$" },
        genres: { bsonType: "array", items: { bsonType: "string" } },
        available: { bsonType: "bool" },
        description: { bsonType: "string", minLength: 3 }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
print("collMod ok=" + collMod.ok);

function expectReject(label, doc) {
  try {
    db.books.insertOne(doc);
    print(label + ": UNEXPECTED SUCCESS");
  } catch (e) {
    const line = String(e.message).split("\n")[0];
    print(label + ": REJECTED code=" + e.code + " " + line);
  }
}

expectReject("year 3000", {
  title: "Тестова книга",
  author: "Тестовий автор",
  publication_year: NumberInt(3000),
  available: true,
  isbn: "978-966-00-0099-1"
});
expectReject("available string", {
  title: "Тестова книга",
  author: "Тестовий автор",
  publication_year: NumberInt(2020),
  available: "yes",
  isbn: "978-966-00-0099-2"
});
expectReject("bad isbn", {
  title: "Тестова книга",
  author: "Тестовий автор",
  publication_year: NumberInt(2020),
  available: true,
  isbn: "NOT-ISBN"
});

const valid = db.books.insertOne({
  title: "Валідний тимчасовий запис",
  author: "Тестовий автор",
  publication_year: NumberInt(2024),
  pages: NumberInt(120),
  isbn: "978-966-00-0100-5",
  genres: ["довідник"],
  available: true,
  description: "Документ проходить JSON Schema і буде видалений",
  ratings: [],
  borrowed_count: NumberInt(0),
  version: NumberInt(1),
  location: { type: "Point", coordinates: [25.3254, 50.7472], branch: "Центральна бібліотека Луцька" },
  temp: true
});
print("valid insert: " + valid.insertedId);
print("valid deleted: " + db.books.deleteOne({ isbn: "978-966-00-0100-5" }).deletedCount);

const duplicateIsbn = Object.assign({}, books[0]);
delete duplicateIsbn._id;
try {
  db.books.insertOne(duplicateIsbn);
  print("duplicate isbn: UNEXPECTED SUCCESS");
} catch (e) {
  print("duplicate isbn: REJECTED code=" + e.code);
}
endShot("validation");

shot("geo");
const geoIdx = db.books.createIndex({ location: "2dsphere" }, { name: "location_2dsphere" });
print("2dsphere index: " + geoIdx);
print("$geoNear maxDistance 5000 м від центру Луцька:");
db.books.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [25.3254, 50.7472] },
      distanceField: "distance_m",
      maxDistance: 5000,
      spherical: true
    }
  },
  { $project: { _id: 0, title: 1, branch: "$location.branch", distance_m: { $round: ["$distance_m", 1] } } }
]).forEach((row) => print("  " + row.distance_m + " м | " + row.title + " | " + row.branch));

print("$near maxDistance 150000 м (Волинь і Рівне):");
db.books.find(
  { location: { $near: { $geometry: { type: "Point", coordinates: [25.3254, 50.7472] }, $maxDistance: 150000 } } },
  { title: 1, "location.branch": 1, _id: 0 }
).forEach((row) => print("  " + row.title + " | " + row.location.branch));
endShot("geo");

shot("history");
function updateBookWithHistory(filter, setFields, note) {
  const current = db.books.findOne(filter);
  const snapshot = Object.assign({}, current);
  delete snapshot._id;
  db.book_history.insertOne({
    book_id: current._id,
    title: current.title,
    version: current.version,
    note,
    snapshot,
    changed_at: new Date()
  });
  setFields.updated_at = new Date();
  return db.books.updateOne({ _id: current._id }, { $set: setFields, $inc: { version: 1 } });
}

const h1 = updateBookWithHistory({ title: "Кобзар" }, { pages: NumberInt(240), available: true }, "Уточнено кількість сторінок і повернено в фонд");
print("history update 1 modified=" + h1.modifiedCount);
const h2 = updateBookWithHistory({ title: "Кобзар" }, { description: "Збірка віршів Тараса Шевченка. Видання з фонду бібліотеки Луцька." }, "Оновлено опис");
print("history update 2 modified=" + h2.modifiedCount);
// Токени після зміни опису треба оновити, інакше текстовий індекс лишається на старому тексті.
const kobzar = db.books.findOne({ title: "Кобзар" });
db.books.updateOne(
  { _id: kobzar._id },
  { $set: { uk_tokens: ukTokens([kobzar.title, kobzar.description, (kobzar.genres || []).join(" ")].join(" ")) } }
);

print("current Кобзар:");
printjson(db.books.findOne({ title: "Кобзар" }, { _id: 0, title: 1, pages: 1, version: 1, available: 1, description: 1, updated_at: 1 }));
print("history rows: " + db.book_history.countDocuments({ title: "Кобзар" }));
db.book_history.find({ title: "Кобзар" }, { _id: 0, version: 1, note: 1, changed_at: 1, "snapshot.pages": 1, "snapshot.available": 1, "snapshot.description": 1 }).sort({ version: 1 }).forEach((row) => {
  print("  v" + row.version + " pages=" + row.snapshot.pages + " available=" + row.snapshot.available + " note=" + row.note);
});
endShot("history");

shot("replica");
const status = rs.status();
print("set: " + status.set);
print("myState: " + status.myState);
status.members.forEach((m) => {
  print("member " + m.name + " state=" + m.stateStr + " health=" + m.health + " self=" + (m.self === true));
});
try {
  const info = rs.printSecondaryReplicationInfo();
  if (info) print("secondary info printed above");
} catch (e) {
  print("printSecondaryReplicationInfo: " + e.message);
}
endShot("replica");

shot("final");
print("collection infos:");
db.getCollectionInfos().forEach((c) => print("  " + c.name + " type=" + c.type));
print("books indexes:");
db.books.getIndexes().forEach((idx) => print("  " + idx.name + " key=" + JSON.stringify(idx.key) + (idx.unique ? " unique" : "")));
print("FINAL books=" + db.books.countDocuments() + " authors=" + db.authors.countDocuments() + " users=" + db.users.countDocuments() + " history=" + db.book_history.countDocuments() + " available_view=" + db.available_books.countDocuments());
print("LAB06_OK");
endShot("final");
