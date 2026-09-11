# Signup and navigation refinements

## What will change
- Make signup accept any password of at least 8 characters; remove uppercase, lowercase, number, and symbol enforcement from signup only.
- Keep password confirmation, CAPTCHA, email verification, authentication, and all server protections unchanged.
- Present the Gizmo Dan Kaita logo on its requested blue background in shared headers and side navigation.
- Enable intent-based route preloading so internal pages begin loading before a click completes, reducing perceived navigation delay.
- Preserve the existing Gizmo-derived design tokens and responsive panel styling.

## Marketplace note
- Keep the embedded agriculture marketplace and its functionality intact. Price-direction colors inside that separately hosted marketplace cannot be changed from this repository; they must be updated in the marketplace project itself.

## Validation
- Check signup validation accepts an 8-character weak password and rejects shorter passwords.
- Run TypeScript checks and verify mobile/desktop navigation visually.
