// Quick test for the Java runner (AP CS A syntax coverage)
// We need to stub vue's `ref` so the module can be loaded under Node.
import Module from 'node:module'
const origResolve = (Module as any)._resolveFilename
;(Module as any)._resolveFilename = function (request: string, ...rest: any[]) {
    if (request === 'vue') return require.resolve('./vue-stub.cjs')
    return origResolve.call(this, request, ...rest)
}

import { createJavaRunner } from './java'

async function runOne(label: string, code: string, input = '') {
    console.log('=== ' + label + ' ===')
    const out: string[] = []
    const runner = createJavaRunner()
    await runner.run({ code, input, onOutput: (s) => out.push(s) })
    console.log(out.join(''))
    console.log()
}

await runOne(
    'Hello world',
    `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, World!");
  }
}`,
)

await runOne(
    'For loop + array',
    `public class Main {
  public static void main(String[] args) {
    int[] a = {3, 1, 4, 1, 5, 9, 2, 6};
    int sum = 0;
    for (int i = 0; i < a.length; i++) {
      sum += a[i];
    }
    System.out.println("sum=" + sum);
    int max = a[0];
    for (int x : a) if (x > max) max = x;
    System.out.println("foreach max=" + max);
  }
}`,
)

await runOne(
    'Scanner + while',
    `import java.util.Scanner;
public class Main {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    int n = sc.nextInt();
    int sum = 0;
    for (int i = 0; i < n; i++) sum += sc.nextInt();
    System.out.println(sum);
  }
}`,
    '3\n10 20 30\n',
)

await runOne(
    'ArrayList + try/catch',
    `import java.util.ArrayList;
public class Main {
  public static void main(String[] args) {
    ArrayList<Integer> list = new ArrayList<>();
    list.add(10);
    list.add(20);
    list.add(30);
    System.out.println(list.size());
    try {
      System.out.println(list.get(5));
    } catch (Exception e) {
      System.out.println("caught: " + e.getMessage());
    }
    for (int x : list) System.out.println(x);
  }
}`,
)

await runOne(
    'Inheritance + polymorphism',
    `public class Main {
  public static void main(String[] args) {
    Animal[] a = new Animal[2];
    a[0] = new Dog("Rex");
    a[1] = new Cat("Mimi");
    for (Animal x : a) x.speak();
  }
}
class Animal {
  String name;
  public Animal(String name) { this.name = name; }
  public void speak() { System.out.println("..."); }
}
class Dog extends Animal {
  public Dog(String n) { super(n); }
  public void speak() { System.out.println(name + ": woof"); }
}
class Cat extends Animal {
  public Cat(String n) { super(n); }
  public void speak() { System.out.println(name + ": meow"); }
}`,
)

await runOne(
    'Recursion (factorial)',
    `public class Main {
  static int fact(int n) {
    if (n <= 1) return 1;
    return n * fact(n - 1);
  }
  public static void main(String[] args) {
    System.out.println(fact(5));
  }
}`,
)

await runOne(
    'String + Math',
    `public class Main {
  public static void main(String[] args) {
    String s = "Hello, World!";
    System.out.println(s.length());
    System.out.println(s.substring(0, 5));
    System.out.println(s.indexOf("World"));
    System.out.println(Math.max(3, 7));
    System.out.println(Math.sqrt(16));
    System.out.println(Math.pow(2, 10));
  }
}`,
)

await runOne(
    'Ternary + switch + while',
    `public class Main {
  public static void main(String[] args) {
    int x = 5;
    int y = (x % 2 == 0) ? x / 2 : x * 3 + 1;
    System.out.println(y);
    int day = 3;
    switch (day) {
      case 1: System.out.println("Mon"); break;
      case 2: System.out.println("Tue"); break;
      case 3: System.out.println("Wed"); break;
      default: System.out.println("Other");
    }
    int n = 10;
    int sum = 0;
    int i = 1;
    while (i <= n) { sum += i; i++; }
    System.out.println("sum1to10=" + sum);
  }
}`,
)

await runOne(
    '2D array',
    `public class Main {
  public static void main(String[] args) {
    int[][] m = { {1, 2, 3}, {4, 5, 6} };
    for (int r = 0; r < m.length; r++) {
      for (int c = 0; c < m[r].length; c++) {
        System.out.print(m[r][c] + " ");
      }
      System.out.println();
    }
  }
}`,
)

await runOne(
    'Object + method overload + static',
    `public class Main {
  static int add(int a, int b) { return a + b; }
  static double add(double a, double b) { return a + b; }
  public static void main(String[] args) {
    System.out.println(add(1, 2));
    System.out.println(add(1.5, 2.5));
  }
}`,
)
