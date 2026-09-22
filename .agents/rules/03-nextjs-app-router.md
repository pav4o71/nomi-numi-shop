---
description: Specific rules for Next.js 16 App Router.
alwaysApply: true
---

# Next.js 16 Rules

This project runs Next.js 16. Dynamic route parameters are asynchronous and must be awaited. This is not optional legacy compatibility behavior.

**Correct pattern:**
```ts
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return Response.json({ id });
}
```

**Rules:**
- Always use `Promise<...>` for dynamic `params` in Route Handlers.
- Always `await params` before accessing values.
- Do not use the obsolete synchronous `{ params: { id: string } }` signature.
- Prefer standard Web `Request` and `Response` APIs.
- Use `NextRequest` only when Next-specific functionality such as `nextUrl` or cookies is required.
- Keep business logic in application services, not in `route.ts`.
- Do not introduce `NextApiRequest` or `NextApiResponse` into App Router Route Handlers.
