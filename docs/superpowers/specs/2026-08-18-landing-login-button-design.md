# Design Specification: Landing Page Login Button Integration

- **Date:** 2026-08-18
- **Topic:** Landing Page Header Sign-In Navigation
- **Status:** Approved

## 1. Objective
Add a dedicated "Sign in" button to the Landing Page header navigation bar (both desktop and mobile viewports) that directs users to the `/login` route, positioned alongside the existing "Open Dashboard" CTA.

## 2. Requirements & UI/UX Specifications

### 2.1 Desktop Navigation
- **Location:** Inside `Navigation.js` within the right-hand action container (alongside "Open Dashboard").
- **Visual Appearance:**
  - Ghost / Subtle secondary button style matching the dark-theme aesthetic.
  - Text: `Sign in`
  - Style classes: `text-sm font-medium text-gray-300 hover:text-white hover:bg-[#16181F] px-3.5 py-1.5 rounded-lg border border-transparent hover:border-[#282B37] transition-all cursor-pointer`
- **Interaction:**
  - Clicking triggers `router.push('/login')`.

### 2.2 Mobile Menu Dropdown
- **Location:** In the mobile drawer below the navigation links and above the "Open Dashboard" button.
- **Visual Appearance:**
  - Outline button style.
  - Text: `Sign in`
  - Style classes: `h-10 rounded-lg border border-[#282B37] bg-[#16181F] text-white hover:bg-[#1F222B] text-sm font-semibold flex items-center justify-center cursor-pointer transition-colors`
- **Interaction:**
  - Clicking closes the mobile drawer and navigates to `/login`.

## 3. Files Impacted
- [`src/app/landing/components/Navigation.js`](file:///Volumes/Code/Opensource/mrouter/src/app/landing/components/Navigation.js): Update desktop action container and mobile menu dropdown.

## 4. Verification & Testing
- Verify desktop view: "Sign in" button is visible and routes to `/login`.
- Verify mobile viewport: Menu drawer shows "Sign in" and clicking navigates to `/login` and closes drawer.
- Verify styling consistency with the BeeRouter amber & dark theme palette.
