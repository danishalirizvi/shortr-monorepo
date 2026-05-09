# Frontend Implementation Plan: Core Shortener

This document outlines the specialized implementation of the `shortr` frontend, focusing exclusively on the URL generation experience and engineering excellence.

---

## 1. Environment & Setup
**Objective**: Establish a strict, professional development environment.

1. **Initialization**:
   ```bash
   npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
   ```
2. **Key Dependencies**:
   - `lucide-react`: Professional iconography.
   - `clsx`, `tailwind-merge`: Utility for clean dynamic class management.
3. **API Configuration**:
   - `NEXT_PUBLIC_API_BASE_URL`: Pointer to the Express backend.

---

## 2. API Contract: Public Shortening
**Endpoint**: `POST /api/v1/public-create`

### Request Body
```typescript
interface ShortenRequest {
  longURL: string; // Must be a valid URL
}
```

### Success Response (201)
```typescript
interface ShortenResponse {
  shortUrl: string;
  shortCode: string;
  longURL: string;
}
```

### Error Responses
- **429**: Rate limited (3 per hour).
- **400**: Invalid URL format.
- **500**: Server error.

---

## 3. Engineering Steps

### Step 1: Resilient API Client (`lib/api.ts`)
- Implement a `shortenUrl` function using `fetch`.
- **Standard Practice**: Use a `try/catch` block that transforms raw errors into user-friendly messages (e.g., "Invalid URL" vs "Please wait an hour").

### Step 2: Studio Minimalist UI (`components/UrlShortener.tsx`)
- **UI Architecture**:
  - A centered, narrow container (`max-w-md`).
  - Large, clear input field with a professional focus state (`ring-zinc-950`).
  - Primary button with "Shorten" and "Loading..." states using `useTransition`.
- **Logic**:
  - **Client-Side Sanitization**: Strip whitespace and validate URL protocol before sending.
  - **Success State**: Replace input (or show below) with a clean card containing the short link and a prominent "Copy" button.

### Step 3: Global Polish (`app/layout.tsx` & `page.tsx`)
- Configure font (Inter) and global styles.
- **Standard Practice**: Implement a "No JS" fallback and basic meta tags for professional presentation.

---

## 4. Professional Quality Checklist

### Security & Safety
- [ ] **Input Sanitization**: Client-side validation to prevent obvious bad data.
- [ ] **Rate Limit Feedback**: Specific UI treatment for 429 status codes.
- [ ] **Environment Isolation**: No hardcoded API URLs.

### User Experience (UX)
- [ ] **Zero Layout Shift**: The result card should appear smoothly without jumping.
- [ ] **Copy Feedback**: Button text changes to "Copied!" for 2 seconds after click.
- [ ] **Error Clarity**: Errors appear in a non-disruptive but visible toast or inline message.

### Code Quality
- [ ] **Type Safety**: No `any` types. Strict interfaces for all API payloads.
- [ ] **Component Separation**: Keep the `UrlShortener` logic distinct from the visual `Button` or `Input` components.
- [ ] **Performance**: Minimize client-side bundles; use Next.js default optimizations.
