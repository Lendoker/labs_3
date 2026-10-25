const targets = ["library-mongo", "library-mongo-2", "library-mongo-3"];
print("checked_from: " + db.hello().me + " state=" + (db.hello().isWritablePrimary ? "PRIMARY" : "SECONDARY"));
const lib = db.getSiblingDB("library");
print("library.books=" + lib.books.countDocuments());
print("library.authors=" + lib.authors.countDocuments());
print("library.users=" + lib.users.countDocuments());
print("library.book_history=" + lib.book_history.countDocuments());
