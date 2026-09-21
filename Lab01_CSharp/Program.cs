using System.Globalization;
using System.Text;

Console.OutputEncoding = Encoding.UTF8;
Console.InputEncoding = Encoding.UTF8;

while (true)
{
    SafeClear();
    Console.WriteLine("ЛАБОРАТОРНА РОБОТА №1 — КОНСОЛЬНІ ЗАСТОСУНКИ C#");
    Console.WriteLine("1 — Таблиця f(x) = x²");
    Console.WriteLine("2 — Таблиця f(x1, x2) = x1² + e^x2");
    Console.WriteLine("3 — Факторіал і сума факторіалів");
    Console.WriteLine("4 — Досконалі числа");
    Console.WriteLine("5 — Аналіз тексту");
    Console.WriteLine("0 — Вихід");
    Console.Write("\nОберіть завдання: ");

    switch (Console.ReadLine())
    {
        case "1": FunctionOneVariable(); break;
        case "2": FunctionTwoVariables(); break;
        case "3": Factorials(); break;
        case "4": PerfectNumbers(); break;
        case "5": AnalyzeText(); break;
        case "0": return;
        default: Pause("Невірний пункт меню."); break;
    }
}

static void FunctionOneVariable()
{
    SafeClear();
    Console.WriteLine("f(x) = x²");
    double min = ReadDouble("x_min: ");
    double max = ReadDouble("x_max: ");
    double step = ReadPositiveDouble("dx (> 0): ");
    if (min > max) (min, max) = (max, min);

    var rows = new List<(double x, double y)>();
    for (double x = min; x <= max + step * 1e-9; x += step)
        rows.Add((x, x * x));
    if (rows.Count == 0 || Math.Abs(rows[^1].x - max) > step * 1e-9)
        rows.Add((max, max * max));
    PrintTable(rows, "x", "f(x)", r => $"{r.x,12:F4} | {r.y,12:F4}");
    PrintStatistics(rows.Select(r => r.y));
    Pause();
}

static void FunctionTwoVariables()
{
    SafeClear();
    Console.WriteLine("f(x1, x2) = x1² + e^x2");
    double x1Min = ReadDouble("x1_min: "), x1Max = ReadDouble("x1_max: ");
    double dx1 = ReadPositiveDouble("dx1 (> 0): ");
    double x2Min = ReadDouble("x2_min: "), x2Max = ReadDouble("x2_max: ");
    double dx2 = ReadPositiveDouble("dx2 (> 0): ");
    if (x1Min > x1Max) (x1Min, x1Max) = (x1Max, x1Min);
    if (x2Min > x2Max) (x2Min, x2Max) = (x2Max, x2Min);

    var rows = new List<(double x1, double x2, double y)>();
    for (double x1 = x1Min; x1 <= x1Max + dx1 * 1e-9; x1 += dx1)
        for (double x2 = x2Min; x2 <= x2Max + dx2 * 1e-9; x2 += dx2)
            rows.Add((x1, x2, x1 * x1 + Math.Exp(x2)));
    Console.WriteLine("\n{" + new string('-', 44) + "}");
    Console.WriteLine($"{"x1",12} | {"x2",12} | {"f(x1,x2)",14}");
    Console.WriteLine(new string('-', 44));
    foreach (var r in rows) Console.WriteLine($"{r.x1,12:F4} | {r.x2,12:F4} | {r.y,14:F4}");
    Console.WriteLine(new string('-', 44));
    PrintStatistics(rows.Select(r => r.y));
    Pause();
}

static void Factorials()
{
    SafeClear();
    int n = ReadInt("n (1..20): ", 1, 20);
    long factorial = 1, sum = 0;
    Console.WriteLine($"\n{"Число",8} | {"Факторіал",20} | {"Сума",20}");
    Console.WriteLine(new string('-', 56));
    for (int i = 1; i <= n; i++)
    {
        factorial *= i;
        sum += factorial;
        Console.WriteLine($"{i,8} | {factorial,20} | {sum,20}");
    }
    Console.WriteLine($"\n{n}! = {factorial}");
    Console.WriteLine($"1! + ... + {n}! = {sum}");
    Pause();
}

static void PerfectNumbers()
{
    SafeClear();
    int start = ReadInt("Початок діапазону: ");
    int end = ReadInt("Кінець діапазону: ");
    if (start > end) (start, end) = (end, start);
    bool found = false;
    for (int number = Math.Max(2, start); number <= end; number++)
    {
        var divisors = Divisors(number);
        if (divisors.Sum() == number)
        {
            found = true;
            Console.WriteLine($"Досконале число: {number}; дільники: {string.Join(", ", divisors)}");
        }
    }
    if (!found) Console.WriteLine("У заданому діапазоні досконалих чисел не знайдено.");
    Pause();
}

static void AnalyzeText()
{
    SafeClear();
    Console.Write("Введіть текст: ");
    string text = Console.ReadLine() ?? "";
    var words = text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
    int sentences = text.Count(c => c is '.' or '!' or '?');
    const string vowels = "аеєиіїоуюяАЕЄИІЇОУЮЯ";
    const string consonants = "бвгґджзйклмнпрстфхцчшщБВГҐДЖЗЙКЛМНПРСТФХЦЧШЩ";
    int vowelCount = text.Count(vowels.Contains), consonantCount = text.Count(consonants.Contains);
    Console.WriteLine("\nПоказник                 Значення");
    Console.WriteLine(new string('-', 36));
    Console.WriteLine($"Символів                 {text.Length}");
    Console.WriteLine($"Слів                     {words.Length}");
    Console.WriteLine($"Речень                   {sentences}");
    Console.WriteLine($"Голосних                 {vowelCount}");
    Console.WriteLine($"Приголосних              {consonantCount}");
    Pause();
}

static List<int> Divisors(int number)
{
    var result = new List<int>();
    for (int i = 1; i <= number / 2; i++)
        if (number % i == 0) result.Add(i);
    return result;
}

static double ReadDouble(string prompt)
{
    while (true)
    {
        Console.Write(prompt);
        if (double.TryParse(Console.ReadLine(), NumberStyles.Float, CultureInfo.CurrentCulture, out double value))
            return value;
        Console.WriteLine("Введіть коректне число.");
    }
}

static double ReadPositiveDouble(string prompt)
{
    while (true)
    {
        double value = ReadDouble(prompt);
        if (value > 0) return value;
        Console.WriteLine("Значення має бути > 0.");
    }
}

static int ReadInt(string prompt, int min = int.MinValue, int max = int.MaxValue)
{
    while (true)
    {
        Console.Write(prompt);
        if (int.TryParse(Console.ReadLine(), out int value) && value >= min && value <= max) return value;
        Console.WriteLine($"Введіть ціле число в межах [{min}; {max}].");
    }
}

static void PrintTable(List<(double x, double y)> rows, string first, string second, Func<(double x, double y), string> format)
{
    Console.WriteLine($"\n{"Результати",28}");
    Console.WriteLine($"{first,12} | {second,12}");
    Console.WriteLine(new string('-', 28));
    foreach (var row in rows) Console.WriteLine(format(row));
    Console.WriteLine(new string('-', 28));
}

static void PrintStatistics(IEnumerable<double> values)
{
    var data = values.ToList();
    Console.WriteLine($"min = {data.Min():F4}; max = {data.Max():F4}; avg = {data.Average():F4}; " +
                      $"додатних = {data.Count(v => v > 0)}; від'ємних = {data.Count(v => v < 0)}");
}

static void Pause(string message = "Натисніть Enter для продовження...")
{
    Console.WriteLine($"\n{message}");
    Console.ReadLine();
}

static void SafeClear()
{
    try { if (!Console.IsOutputRedirected) Console.Clear(); }
    catch (IOException) { }
}
