
import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';

interface Product {
  id: number;
  name: string;
  price: number;
  rate: number;
  description?: string;
  image?: string;
  vegetarian?: boolean;
  vegeterian?: boolean;
  spiciness?: number;
  ingredients?: string[];
}

interface ProductsResponse {
  data: {
    products: Product[];
    hasMore: boolean;
  };
}

interface ProductResponse {
  data: Product;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  products?: Product[];
}

interface GroqResponse {
  choices: {
    message: {
      content: string | null;
    };
  }[];
}

interface AiAnswer {
  reply: string;
  productIds: number[];
}

@Component({
  selector: 'app-chatbot',
  imports: [FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.scss'
})
export class Chatbot {
  private http = inject(HttpClient);
  private router = inject(Router);

  private groqApiKey = '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';
  private groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private restaurantUrl = 'https://restaurantapi.stepacademy.ge/api';

  isOpen = signal(false);
  message = signal('');
  loading = signal(false);
  menuLoading = signal(true);
  menuError = signal(false);

  products = signal<Product[]>([]);
  private verifiedVegetarian = signal<Product[]>([]);
  private vegetarianChecked = signal(false);

  messages = signal<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'გამარჯობა! 🍽️ მე Foodie AI ვარ. მკითხე კერძების, ფასების, რეიტინგების ან ბიუჯეტის შესახებ.'
    }
  ]);

  constructor() {
    this.loadProducts();
  }

  toggleChat() {
    this.isOpen.update(value => !value);
  }

  loadProducts(page = 1, collected: Product[] = []) {
    this.menuLoading.set(true);

    this.http.get<ProductsResponse>(
      `${this.restaurantUrl}/products`,
      { params: { Take: 100, Page: page } }
    ).subscribe({
      next: response => {
        const all = [
          ...collected,
          ...(response.data?.products ?? [])
        ];

        const unique = [...new Map(
          all.map(product => [product.id, product])
        ).values()];

        this.products.set(unique);

        if (response.data?.hasMore && page < 50) {
          this.loadProducts(page + 1, unique);
        } else {
          this.menuLoading.set(false);
          this.menuError.set(!!response.data?.hasMore);
        }
      },
      error: () => {
        this.menuLoading.set(false);
        this.menuError.set(true);
      }
    });
  }

  sendMessage() {
    const question = this.message().trim();

    if (!question || this.loading()) return;

    if (this.menuLoading()) {
      this.addAssistantMessage('მენიუ ჯერ იტვირთება. სცადე რამდენიმე წამში.');
      return;
    }

    if (this.menuError() || !this.products().length) {
      this.addAssistantMessage('მენიუს სრულად ჩატვირთვა ვერ მოხერხდა.');
      return;
    }

    if (!this.groqApiKey) {
      this.addAssistantMessage('Groq API Key ჯერ არ არის მითითებული.');
      return;
    }

    this.messages.update(items => [
      ...items,
      { role: 'user', text: question }
    ]);

    this.message.set('');
    this.loading.set(true);

    const text = question.toLowerCase();

    const wantsVegetarian =
      text.includes('ვეგეტარიან') ||
      text.includes('vegetarian') ||
      text.includes('veggie');

    if (wantsVegetarian) {
      this.checkVegetarianProducts(() => {
        this.askGroq(question);
      });
    } else {
      this.askGroq(question);
    }
  }

  private checkVegetarianProducts(done: () => void) {
    if (this.vegetarianChecked()) {
      done();
      return;
    }

    const requests = this.products().map(product =>
      this.http.get<ProductResponse>(
        `${this.restaurantUrl}/products/${product.id}`
      ).pipe(
        map(response => ({
          list: product,
          detail: response.data,
          success: true
        })),
        catchError(() => of({
          list: product,
          detail: null,
          success: false
        }))
      )
    );

    if (!requests.length) {
      this.vegetarianChecked.set(true);
      done();
      return;
    }

    forkJoin(requests).subscribe({
      next: results => {
        const verified = results
          .filter(result => {
            if (!result.success || !result.detail) return false;

            const listValue =
              result.list.vegetarian ??
              result.list.vegeterian;

            const detailValue =
              result.detail.vegetarian ??
              result.detail.vegeterian;

            if (listValue === false && detailValue === true) {
              return false;
            }

            if (detailValue !== true) {
              return false;
            }

            const ingredients = result.detail.ingredients ?? [];

            const ingredientText = ingredients.join(' ').toLowerCase();

            const animalIngredients = [
              'lard',
              'meat',
              'chicken',
              'beef',
              'pork',
              'fish',
              'anchovy',
              'gelatin',
              'bacon',
              'ham'
            ];

            return !animalIngredients.some(word =>
              new RegExp(`\\b${word}\\b`, 'i').test(ingredientText)
            );
          })
          .map(result => ({
            ...result.list,
            ...result.detail,
            vegetarian: true,
            vegeterian: true
          }));

        this.verifiedVegetarian.set(verified);
        this.vegetarianChecked.set(
          results.every(result => result.success)
        );

        this.askGroqAfterVegetarianCheck(done);
      },
      error: () => {
        this.verifiedVegetarian.set([]);
        this.vegetarianChecked.set(false);
        done();
      }
    });
  }

  private askGroqAfterVegetarianCheck(done: () => void) {
    done();
  }

  private askGroq(question: string) {
    const text = question.toLowerCase();

    const wantsVegetarian =
      text.includes('ვეგეტარიან') ||
      text.includes('vegetarian') ||
      text.includes('veggie');

    const wantsCheapest =
      text.includes('იაფ') ||
      text.includes('cheapest');

    const wantsExpensive =
      text.includes('ძვირ') ||
      text.includes('expensive');

    const wantsBest =
      text.includes('რეიტინგ') ||
      text.includes('საუკეთესო') ||
      text.includes('rating') ||
      text.includes('rated') ||
      text.includes('best');

    const wantsBudget =
      text.includes('ბიუჯეტ') ||
      text.includes('დოლარ') ||
      text.includes('$') ||
      text.includes('budget') ||
      text.includes('under') ||
      text.includes('მაქვს');

    const budgetMatch = wantsBudget
      ? text.match(/\d+(?:[.,]\d+)?/)
      : null;

    const budget = budgetMatch
      ? Number(budgetMatch[0].replace(',', '.'))
      : null;

    const countMatch = text.match(/\d+/);
    const requestedCount = countMatch && !wantsBudget
      ? Math.min(Math.max(Number(countMatch[0]), 1), 10)
      : 5;

    let available = wantsVegetarian
      ? [...this.verifiedVegetarian()]
      : [...this.products()];

    if (budget !== null) {
      available = available.filter(product =>
        product.price <= budget
      );
    }

    if (wantsCheapest) {
      available.sort((a, b) => a.price - b.price);
    } else if (wantsExpensive) {
      available.sort((a, b) => b.price - a.price);
    } else if (wantsBest || wantsBudget) {
      available.sort((a, b) => b.rate - a.rate);
    }

    if (wantsVegetarian && !available.length) {
      this.addAssistantMessage(
        'ვეგეტარიანული კერძების დადასტურება ვერ მოვახერხე. Restaurant API-ის მონაცემები ერთმანეთს ეწინააღმდეგება ან შესაბამისი კერძები ვერ გადამოწმდა.'
      );
      this.loading.set(false);
      return;
    }

    if (budget !== null && !available.length) {
      this.addAssistantMessage(
        `$${budget}-ის ფარგლებში შესაბამისი კერძი ვერ ვიპოვე.`
      );
      this.loading.set(false);
      return;
    }

    const menu = available.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      rating: product.rate,
      description: product.description ?? '',
      vegetarian: wantsVegetarian
        ? true
        : product.vegetarian ?? product.vegeterian ?? null,
      spiciness: product.spiciness ?? null
    }));

    const systemPrompt = `
You are Foodie AI, a restaurant assistant.

Use only the supplied menu for restaurant-specific facts.

Rules:
- Never invent dishes, prices, ratings or ingredients.
- Recommend only products from the provided menu.
- Respect the customer's budget and dietary preferences.
- Return at most ${requestedCount} product IDs.
- Respond in Georgian if the user writes Georgian.
- Respond in English if the user writes English.
- Be friendly and concise.
- Do not use Markdown tables, bold markers or headings.
- Do not repeat product prices or ratings in your reply.
- Product cards will show real prices and ratings.
- Never claim missing information is confirmed.
- Prices are in USD.

Return ONLY valid JSON:
{
  "reply": "Natural response",
  "productIds": [1, 2, 3]
}

If no products are relevant, return an empty array.

MENU:
${JSON.stringify(menu)}
`;

    const history = this.messages()
      .slice(-8)
      .map(item => ({
        role: item.role,
        content: item.text
      }));

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.groqApiKey}`,
      'Content-Type': 'application/json'
    });

    this.http.post<GroqResponse>(
      this.groqUrl,
      {
        model: 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...history
        ],
        temperature: 0.1,
        max_completion_tokens: 1500,
        response_format: {
          type: 'json_object'
        }
      },
      { headers }
    ).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: response => {
        const content = response.choices?.[0]?.message?.content;

        if (!content) {
          this.addAssistantMessage('AI-ის პასუხი ვერ მივიღე.');
          return;
        }

        try {
          const result = JSON.parse(content) as AiAnswer;

          const ids = Array.isArray(result.productIds)
            ? result.productIds
                .map(id => Number(id))
                .filter(id => Number.isFinite(id))
            : [];

          let selected = ids
            .map(id => available.find(product => product.id === id))
            .filter((product): product is Product => !!product);

          selected = selected.filter((product, index, list) =>
            list.findIndex(item => item.id === product.id) === index
          );

          if (wantsCheapest || wantsExpensive || wantsBest) {
            selected = available.slice(0, requestedCount);
          } else if (
            (wantsBudget || wantsVegetarian) &&
            !selected.length
          ) {
            selected = available.slice(0, requestedCount);
          }

          selected = selected.slice(0, requestedCount);

          const reply = typeof result.reply === 'string'
            ? this.cleanText(result.reply)
            : '';

          this.messages.update(items => [
            ...items,
            {
              role: 'assistant',
              text: wantsCheapest || wantsExpensive || wantsBest
                ? 'აი შესაბამისი კერძები ჩვენი მენიუდან 🍽️'
                : reply || 'აი რას გირჩევ:',
              products: selected
            }
          ]);
        } catch {
          this.addAssistantMessage(
            'AI-ის პასუხის დამუშავება ვერ მოხერხდა.'
          );
        }
      },
      error: error => {
        if (error.status === 401) {
          this.addAssistantMessage('Groq API Key არასწორია ან გაუქმებულია.');
        } else if (error.status === 429) {
          this.addAssistantMessage('Groq-ის ლიმიტი ამოიწურა.');
        } else {
          this.addAssistantMessage('AI-სთან დაკავშირება ვერ მოხერხდა.');
        }
      }
    });
  }

  private cleanText(value: string): string {
    return value
      .replace(/\*\*/g, '')
      .replace(/```/g, '')
      .replace(/^\s*#{1,6}\s*/gm, '')
      .trim();
  }

  private addAssistantMessage(text: string) {
    this.messages.update(items => [
      ...items,
      { role: 'assistant', text }
    ]);
  }

  openProduct(id: number) {
    this.router.navigate(['/product', id]);
    this.isOpen.set(false);
  }

  getImage(product: Product): string {
    return product.image || '';
  }

  isVegetarian(product: Product): boolean {
    return product.vegetarian === true ||
      product.vegeterian === true;
  }
}
