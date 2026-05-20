# playground-finder (working title)

**Project Vision:** A mobile-first, community-driven application to help parents in Slovenia find the perfect playground for their children.

> The final commercial name is TBD. Use `playground-finder` in code/repos for now, and keep all user-facing strings behind i18n keys so the brand can be swapped without code changes.

> 📦 **Going live?** Jump to [Phase 8: Deployment](#phase-8-deployment) or open [docs/deploy.md](deploy.md) directly.

---

## 🚀 Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + DaisyUI
- **Language:** TypeScript
- **Backend/Database:** Supabase (PostgreSQL + PostGIS)
- **Maps:** React Leaflet + OpenStreetMap + `react-leaflet-cluster`
- **Localization:** `next-intl` (Slovenian & English)
- **Hosting:** Vercel
- **Spam Protection:** Cloudflare Turnstile

---

## 🛠 Core Feature List

### 1. Discovery (Map View)
- Full-screen interactive map centered on user's GPS location.
- **Smart Filters:** Shadow (Senca), Fenced (Ograjeno), Water (Pitnik), Toilets, Parking.
- **Equipment Tags:** Swings, Slides, Ziplines, Sandbox, Climbing walls.
- **Surface Types:** Tartan, Sand, Grass, Gravel.
- **Marker Clustering:** Grouped markers at low zoom levels for performance.

### 2. Community Content
- **Detailed Pages:** Image carousels, detailed feature lists, and dynamic status (e.g., "Well maintained").
- **User Ratings:** 1-5 star system.
- **Comments:** User tips and "Helpful" upvotes.
- **Submissions:** Easy "Add Playground" flow with GPS pinning and photo upload.

### 3. User Experience
- **Mobile-First:** Bottom navigation bar, touch-friendly UI.
- **Multilingual:** Seamless toggle between 🇸🇮 SI and 🇬🇧 EN.
- **Profile:** Saved favorites and history of contributions.
- **PWA:** Installable on mobile homescreens.

### 4. GDPR Compliance
- Consent checkbox on registration.
- "Delete my account" and "Export my data" in Settings.
- Photo upload disclaimer about children's privacy.
- Simple essential-cookies banner.
- `/privacy` page available in both SL and EN.

---

## 🏗 Development Phases & Example Prompts

### Phase 1: Project Initialization
**Goal:** Setup the core framework and UI shells.

* **Prompt:** `"Initialize a Next.js 14 project with TypeScript and Tailwind CSS. Install DaisyUI and configure it in tailwind.config.ts. Create a mobile-first Root Layout with a fixed Bottom Navigation bar using Lucide-React icons for 'Map', 'Search', 'Add', and 'Profile'. Use 'next-intl' to setup folders for 'sl' and 'en' locales."`

### Phase 2: Supabase & Authentication
**Goal:** Connect the backend and allow users to log in with full GDPR controls.

* **Prompt:** `"Integrate Supabase Auth into the Next.js app. Create a Login and Sign-up page using DaisyUI components. The sign-up form must include a mandatory, unchecked 'I agree to the Privacy Policy and Terms of Use' checkbox — block submission if unchecked. Set up a 'profiles' table in Supabase with a trigger that auto-creates a profile on user signup. Add a 'Logout' button in the Profile section. In the Profile Settings, add a 'Delete My Account' button that removes all user data and a 'Export My Data' button. Add email verification as a prerequisite before a user can upload images."`

### Phase 3: The Map Core
**Goal:** Display playgrounds on a map with clustering.

* **Prompt:** `"Create a Client-Side component using 'react-leaflet' and 'react-leaflet-cluster'. The map should be full-screen, center on Ljubljana by default, and have a large 'Locate Me' button. Fetch dummy playground data (lat/lng) and render them as custom markers grouped with MarkerClusterGroup. When a marker is clicked, open a DaisyUI Bottom Sheet (Drawer) showing the playground name."`

### Phase 4: Data Entry & Media
**Goal:** Let users contribute content.

* **Prompt:** `"Build a multi-step 'Add Playground' form. Step 1: User taps the map to set coordinates. Step 2: Input name, description, surface type (tartan/sand/grass/gravel), and toggle checkboxes for features (shade, water, fence, toilets, parking). Step 3: Use Supabase Storage to allow image uploads. On the upload screen, display a clear notice: 'Prosimo, ne objavljajte fotografij, na katerih so prepoznavni obrazi otrok.' Add Cloudflare Turnstile to the final submit button to prevent spam."`

### Phase 5: Search & Advanced Filters
**Goal:** Help users find specific parks.

* **Prompt:** `"Create a 'Filters' drawer that slides out from the side. Add checkboxes for all playground features (Senca, Pitnik, Ograjeno, Toilets, Parking) and surface type options. Implement logic to filter the markers on the map in real-time based on the selected filters. Use React Context to manage this filter state globally."`

### Phase 6: Reviews & Social Features
**Goal:** Community ratings, comments, and moderation.

* **Prompt:** `"Add a 'Reviews' section to the playground detail view. Allow users to leave a star rating (1–5) and a comment. Add a 'Helpful' upvote button on each comment. Add a 'Report' button on playgrounds, reviews, and photos — with options including 'Privacy Violation (photo of child)'. If a target receives 3+ reports, automatically flag it for admin review by setting a 'flagged' boolean in the database."`

### Phase 7: Translations & Launch Prep
**Goal:** Full localization, GDPR pages, and PWA.

* **Prompt:** `"Ensure all UI text is wrapped in the next-intl t() function. Populate sl.json and en.json with all necessary strings. Create a /privacy page rendered in both SL and EN describing data usage (Supabase, Vercel, Cloudflare). Add a react-cookie-consent banner with the message 'We use essential cookies to keep you logged in.' Finally, configure next-pwa to make the app installable on mobile homescreens with an appropriate manifest and icons."`

### Phase 7.5: GDPR Controls & Admin
**Goal:** Self-service data rights and a moderation surface for flagged content.

* **Built:**
  * Profile page: real **Export my data** (JSON download) and **Delete my account** (cascade-deletes user content; submitted playgrounds keep `user_id = null`).
  * `is_admin` column on `profiles` with RLS bypass policies so admins can see flagged rows and edit/delete anyone's content.
  * `/admin` dashboard with stat tiles.
  * `/admin/moderation` for triaging flagged playgrounds, reviews, and photos (Approve clears the flag and wipes reports; Delete removes the row).
  * `/admin/playgrounds` table editor for curating all playgrounds.
  * `<Turnstile />` placeholder component on signup + add-playground; renders the real Cloudflare widget when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set, otherwise shows a dev-only notice.

### Phase 8: Deployment
**Goal:** Get the app on a public URL for testers.

* See the **full procedure** in [docs/deploy.md](deploy.md). Covers:
  * Supabase project provisioning + migration push
  * Vercel deploy + environment variables
  * Promoting yourself to admin
  * Sharing the URL with testers
  * (Alternative) Wiring **Cursor's MCP integrations** for Supabase + Vercel so the entire setup happens from your editor — see [docs/deploy.md#alternative-cursor--mcp-flow](deploy.md#alternative-cursor--mcp-flow)
  * Post-deploy checklist, ongoing updates, rollback

---

## 🔒 Security & Spam Strategy
1. **Row Level Security (RLS):** Only authenticated users can write to the database.
2. **Cloudflare Turnstile:** Verified on all submission forms.
3. **Reporting Logic:** If a playground, review, or photo receives 3+ reports, it is automatically flagged for admin review.
4. **Email Verification:** Required for users before they can upload images.
5. **Admin Review:** Flagged content is reviewed via a minimal `/admin` route or directly in the Supabase dashboard.

---

## 📁 Database Schema (Supabase SQL)

```sql
-- Profiles (auto-created via trigger on auth.users insert)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Playgrounds
create table playgrounds (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location geography(Point, 4326) not null, -- PostGIS; use ST_DWithin for proximity queries
  description text,
  is_fenced boolean default false,
  has_shade boolean default false,
  has_water boolean default false,
  has_toilets boolean default false,
  has_parking boolean default false,
  surface_type text check (surface_type in ('tartan', 'sand', 'grass', 'gravel')),
  equipment jsonb,
  flagged boolean default false,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id)
);

-- Photos
create table photos (
  id uuid primary key default uuid_generate_v4(),
  playground_id uuid references playgrounds(id) on delete cascade,
  user_id uuid references auth.users(id),
  storage_path text not null,
  flagged boolean default false,
  created_at timestamptz default now()
);

-- Reviews
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  playground_id uuid references playgrounds(id) on delete cascade,
  user_id uuid references auth.users(id),
  rating int check (rating >= 1 and rating <= 5),
  comment text,
  helpful_count int default 0,
  flagged boolean default false,
  created_at timestamptz default now()
);

-- Favorites
create table favorites (
  user_id uuid references profiles(id) on delete cascade,
  playground_id uuid references playgrounds(id) on delete cascade,
  primary key (user_id, playground_id)
);

-- Reports
create table reports (
  id uuid primary key default uuid_generate_v4(),
  target_type text check (target_type in ('playground', 'review', 'photo')),
  target_id uuid not null,
  user_id uuid references auth.users(id),
  reason text check (reason in ('spam', 'incorrect_info', 'privacy_violation', 'other')),
  created_at timestamptz default now()
);
```

### Proximity Query Example (PostGIS)
```sql
-- Find playgrounds within 5km of a point
select * from playgrounds
where ST_DWithin(
  location,
  ST_MakePoint(14.5058, 46.0569)::geography,
  5000
);
```
