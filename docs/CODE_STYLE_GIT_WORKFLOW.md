# CODE STYLE & GIT WORKFLOW REFERENCE
**Version:** 1.0 | **Last Updated:** 2026-06-21  
**Purpose:** Live reference for code quality, formatting, git practices — enforce consistency

---

## 1. Git Workflow & Branch Strategy

### Branch Naming Convention

```
main                    # Production branch, always deployable
staging                 # Staging/pre-prod branch (optional)
feature/[feature-name]  # New features: feature/contact-form, feature/algo-visualizer
fix/[bug-name]         # Bug fixes: fix/contact-form-honeypot
docs/[section]         # Docs: docs/backend-setup
refactor/[area]        # Refactoring: refactor/api-error-handling
```

### Commit Message Format

**Rule:** Clear, descriptive commit messages. Use the format below.

```
[type]: Short description (50 chars max)

Optional longer explanation (72 chars per line).
Explain the WHY, not just the WHAT.

Fixes #123  (if fixing an issue)
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Formatting, no code change
- `refactor:` Code restructure, no behavior change
- `test:` Add/update tests
- `chore:` Deps, build config, etc.

**Examples:**

```
feat: Add contact form endpoint with honeypot protection

Implements POST /api/v1/contact with Pydantic validation,
rate limiting, and honeypot bot trap. Sends notification
email via Resend on successful submission.

Fixes #42

---

fix: Prevent flash of unstyled theme on page load

next-themes blocking script was not wired correctly in
_document. Moved to proper location in layout.tsx.

---

docs: Add deployment guide for Render

Clarifies Docker setup, environment variables, and
health check configuration for the FastAPI backend.
```

### Pull Request Process

1. **Create feature branch:**
   ```bash
   git checkout -b feature/contact-form
   ```

2. **Push early, create PR (even if incomplete):**
   ```bash
   git push origin feature/contact-form
   # Opens PR on GitHub, Vercel creates preview
   ```

3. **Mark as draft if incomplete:**
   ```
   [Draft] Add contact form
   - [ ] Backend validation tests
   - [ ] Frontend error handling
   - [ ] Email integration
   ```

4. **Request review:**
   - Assign yourself (solo project, but good practice)
   - Check CI/CD status (GitHub Actions must pass)
   - Verify preview deployment on Vercel

5. **Address feedback:**
   ```bash
   git add .
   git commit -m "fix: Address review feedback on error handling"
   git push origin feature/contact-form
   # PR automatically updates
   ```

6. **Merge to main:**
   - Use **Squash and Merge** for clean history (default)
   - Delete branch after merge
   - Auto-deploy to production

---

## 2. TypeScript & JavaScript Conventions

### Setup (One-time)

**File: `.eslintrc.json`** (frontend)

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "react/no-unescaped-entities": "warn",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
    ],
    "@typescript-eslint/explicit-function-return-types": [
      "warn",
      { "allowExpressions": true }
    ]
  }
}
```

**File: `prettier.config.js`**

```javascript
module.exports = {
  printWidth: 100,
  semi: true,
  singleQuote: false,
  trailingComma: "es5",
  tabWidth: 2,
  useTabs: false,
};
```

### TypeScript Rules

1. **Always type function parameters and return types:**
   ```typescript
   // ✅ Good
   function calculateSum(a: number, b: number): number {
     return a + b;
   }

   // ❌ Bad
   function calculateSum(a, b) {
     return a + b;
   }
   ```

2. **Use strict null checks:**
   ```typescript
   // ✅ Good
   function getName(user: { name: string | null }): string {
     return user.name ?? "Anonymous";
   }

   // ❌ Bad (assumes name is always string)
   function getName(user) {
     return user.name;
   }
   ```

3. **Extract complex types into interfaces:**
   ```typescript
   // ✅ Good
   interface ContactFormData {
     name: string;
     email: string;
     message: string;
   }

   // ❌ Bad (inline object type)
   function handleSubmit(data: { name: string; email: string; message: string }) {}
   ```

4. **Use const for all non-reassigned variables:**
   ```typescript
   // ✅ Good
   const MAX_LENGTH = 100;
   const user = { name: "Alice" };

   // ❌ Bad
   let MAX_LENGTH = 100;
   var user = { name: "Alice" };
   ```

5. **Avoid `any` type; use `unknown` if necessary:**
   ```typescript
   // ✅ Good
   function parseData(data: unknown): Data {
     if (isData(data)) return data;
     throw new Error("Invalid data");
   }

   // ❌ Bad
   function parseData(data: any): Data {
     return data;  // No type safety
   }
   ```

### React Component Patterns

1. **Use functional components with hooks:**
   ```typescript
   // ✅ Good
   interface ButtonProps {
     onClick: () => void;
     children: React.ReactNode;
   }

   export function Button({ onClick, children }: ButtonProps) {
     return <button onClick={onClick}>{children}</button>;
   }

   // ❌ Bad (class component, unless necessary)
   class Button extends React.Component { ... }
   ```

2. **Server components by default, `"use client"` only when needed:**
   ```typescript
   // ✅ Good (server component, fetches data server-side)
   export default async function ProjectsPage() {
     const projects = await getAllProjects();
     return <ProjectGrid projects={projects} />;
   }

   // Only the interactive part is client:
   "use client";  // This component only
   export function ThemeToggle() {
     const [dark, setDark] = useState(false);
     return <button onClick={() => setDark(!dark)}>Toggle</button>;
   }
   ```

3. **Props destructuring:**
   ```typescript
   // ✅ Good
   export function Card({ title, children }: CardProps) {
     return <div><h2>{title}</h2>{children}</div>;
   }

   // ❌ Bad
   export function Card(props: CardProps) {
     return <div><h2>{props.title}</h2>{props.children}</div>;
   }
   ```

### Run Linting & Format

```bash
# Check lint errors
pnpm lint

# Auto-fix
pnpm lint --fix

# Format code
pnpm format
# or: prettier --write "app/**/*.tsx"
```

---

## 3. Python Conventions (Backend)

### Setup (One-time)

**File: `pyproject.toml`** (already in backend reference, but key sections):

```toml
[tool.black]
line-length = 100
target-version = ["py312"]

[tool.ruff]
line-length = 100
target-version = "py312"
select = ["E", "F", "W", "I"]  # PEP 8, errors, warnings, imports
```

### Python Rules

1. **Import organization (isort style):**
   ```python
   # ✅ Good
   from typing import Optional
   from datetime import datetime
   import logging

   from fastapi import APIRouter
   from pydantic import BaseModel

   from app.core.config import get_settings
   from app.services import email_service
   ```

2. **Function and variable naming:**
   ```python
   # ✅ Good
   def send_contact_notification(name: str, email: str) -> bool:
       """Send email notification for contact submission."""
       ...

   MAX_MESSAGE_LENGTH = 3000
   is_authenticated = True

   # ❌ Bad
   def SendContactNotification(name, email):  # PascalCase for function
       pass

   max_message_length = 3000  # Could be uppercase constant
   Is_Authenticated = True    # Weird casing
   ```

3. **Docstrings (Google style):**
   ```python
   def insert_contact_message(
       name: str,
       email: str,
       message: str,
       ip_hash: str,
   ) -> Optional[str]:
       """
       Insert a contact form submission into the database.

       Args:
           name: Visitor's name (1-100 characters).
           email: Visitor's email address.
           message: Contact message (10-3000 characters).
           ip_hash: SHA256 hash of visitor's IP address.

       Returns:
           UUID of inserted row, or None if insertion failed.

       Raises:
           DatabaseError: If the database query fails.
       """
       try:
           response = supabase_client.table("messages").insert({...}).execute()
           return response.data[0]["id"] if response.data else None
       except Exception as e:
           logger.error(f"Insert failed: {e}")
           return None
   ```

4. **Type hints everywhere:**
   ```python
   # ✅ Good
   def get_user_age(user_id: int) -> Optional[int]:
       ...

   messages: list[str] = []
   data: dict[str, Any] = {}

   # ❌ Bad
   def get_user_age(user_id):
       ...

   messages = []
   data = {}
   ```

### Run Linting & Format

```bash
# Check formatting
black --check app/

# Auto-format
black app/

# Check lint errors
ruff check app/

# Auto-fix
ruff check --fix app/

# Type checking
mypy app/
```

---

## 4. Git Commit Workflow (Step-by-Step)

### Daily Workflow

```bash
# 1. Start feature branch
git checkout -b feature/contact-form

# 2. Make changes, commit regularly (not one massive commit)
# Edit app/api/v1/contact.py
git add app/api/v1/contact.py
git commit -m "feat: Add contact form endpoint"

# Edit app/models/schemas.py
git add app/models/schemas.py
git commit -m "feat: Add ContactRequest validation schema"

# 3. Push branch and create PR
git push origin feature/contact-form
# Copy link from terminal, open GitHub, create PR

# 4. While waiting for review, continue working on other things
git checkout -b feature/health-check
# Repeat workflow above

# 5. When PR approved, merge and delete branch
git checkout main
git pull origin main
git branch -d feature/contact-form
```

### Handling Merge Conflicts

```bash
# If main has new commits while your branch is open:
git fetch origin
git rebase origin/main

# If conflicts occur:
# 1. Edit conflicted files (VSCode shows conflicts visually)
# 2. Resolve by keeping desired changes
git add [resolved-file]
git rebase --continue

# If rebase is too painful:
git rebase --abort
# Try merge instead (creates a merge commit, less clean but simpler)
git merge origin/main
```

---

## 5. Code Review Self-Checklist

Before pushing or requesting review, check:

- [ ] Code follows the style guide (TypeScript, Python, etc.)
- [ ] All functions have type hints
- [ ] All functions have docstrings (Python) or clear comments (TS)
- [ ] No `console.log()` or `print()` statements (use proper logging)
- [ ] No hardcoded secrets or API keys
- [ ] All imports are used (no dead imports)
- [ ] Error handling is explicit (no silent failures)
- [ ] New database queries have proper error handling
- [ ] Tests added for new functionality
- [ ] Commit messages are clear
- [ ] CI/CD passes (GitHub Actions green)

---

## 6. Testing Conventions

### Frontend Tests

**File: `components/ui/button.test.tsx`** (Jest + React Testing Library)

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onClick handler when clicked", async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    await userEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**Run tests:**
```bash
pnpm test           # Jest in watch mode
pnpm test --coverage  # With coverage report
```

### Backend Tests

**File: `tests/test_contact.py`** (pytest)

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_contact_success():
    """Happy path: valid contact form submission."""
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Alice",
            "email": "alice@example.com",
            "message": "Great portfolio!",
            "honeypot": "",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "id" in data

def test_contact_invalid_email():
    """Edge case: invalid email format."""
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Bob",
            "email": "not-an-email",
            "message": "Hey there!",
            "honeypot": "",
        },
    )
    assert response.status_code == 422  # Unprocessable entity

@pytest.mark.asyncio
async def test_contact_with_mock_db(monkeypatch):
    """Unit test: mock the database layer."""
    from unittest.mock import AsyncMock
    mock_insert = AsyncMock(return_value="uuid-123")
    monkeypatch.setattr(
        "app.services.supabase_service.insert_contact_message",
        mock_insert,
    )
    # Test continues...
```

**Run tests:**
```bash
pytest -v             # Verbose output
pytest -v --cov       # With coverage
pytest -v -k "contact"  # Run only contact tests
```

---

## 7. File Naming Conventions

| Category | Pattern | Example |
|---|---|---|
| React components | PascalCase | `ContactForm.tsx`, `ProjectCard.tsx` |
| Utilities | camelCase | `api.ts`, `content.ts`, `cn.ts` |
| Types/interfaces | PascalCase | `Project.ts`, `ContactRequest.ts` |
| Test files | Same as source + `.test.` | `Button.test.tsx`, `api.test.ts` |
| Python modules | snake_case | `email_service.py`, `rate_limit.py` |
| Python classes | PascalCase | `ContactRequest`, `HealthCheckResponse` |
| Constants | UPPER_SNAKE_CASE | `MAX_LENGTH`, `RATE_LIMIT_WINDOW` |

---

## 8. Documentation Standards

### README.md (Project Root)

```markdown
# Portfolio

A full-stack personal portfolio website and blog platform.

## Quick Start

### Frontend
```bash
cd portfolio
pnpm install
pnpm dev
# Opens http://localhost:3000
```

### Backend
```bash
cd portfolio-api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# Opens http://localhost:8000/docs
```

## Architecture

See [FRONTEND_REFERENCE.md](../docs/FRONTEND_REFERENCE.md), etc.

## Deployment

See [DEPLOYMENT_SCRIPTS.md](../docs/DEPLOYMENT_SCRIPTS.md).
```

### Inline Code Comments

```typescript
// ✅ Good: explains WHY, not WHAT
function rate_limit_by_ip(ip: string): boolean {
  // Redis is used instead of in-memory to survive restarts
  // and allow distributed rate limiting across multiple processes
  return redis.incr(`rate:${ip}`) <= MAX_REQUESTS;
}

// ❌ Bad: explains WHAT (obvious from code)
function rate_limit_by_ip(ip: string): boolean {
  // Increment the counter for this IP
  const count = redis.incr(`rate:${ip}`);
  // Check if it exceeds max
  return count <= MAX_REQUESTS;
}
```

---

## 9. Pre-Commit Hooks (Optional but Recommended)

**File: `.husky/pre-commit`** (auto-runs before commit)

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm lint
pnpm format
```

**Setup:**
```bash
pnpm install husky --save-dev
husky install
npx husky add .husky/pre-commit "pnpm lint && pnpm format"
```

---

## 10. Issue & Task Tracking

### GitHub Issues (Recommended)

1. **New feature:**
   ```
   Title: Add analytics event logging
   
   Description:
   - [ ] Create /api/v1/events endpoint
   - [ ] Add event schema to Supabase
   - [ ] Add frontend logging hook
   - [ ] Document in API_CONTRACTS.md
   ```

2. **Bug:**
   ```
   Title: Contact form honeypot not triggering
   
   Expected: Honeypot field should silently fail if filled
   Actual: Returns validation error
   Steps to reproduce: Fill hidden honeypot field, submit
   ```

---

## Quick Reference Checklist

**Before Committing:**
- [ ] Code formatted (`pnpm format` or `black .`)
- [ ] Linting passes (`pnpm lint` or `ruff check`)
- [ ] No `console.log()` or `print()`
- [ ] No hardcoded secrets
- [ ] Tests added/updated
- [ ] Types and docstrings present

**Before Pushing:**
- [ ] Branch is up-to-date with main (`git fetch && git rebase`)
- [ ] All tests pass locally
- [ ] Commit messages are clear
- [ ] No large files (>10MB) committed

**Before Merging:**
- [ ] GitHub Actions passes
- [ ] Vercel preview looks good
- [ ] Self-review checklist complete
