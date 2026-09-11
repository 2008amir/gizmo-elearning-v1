# Signup and navigation refinements

## What will change

- Make signup accept any password of at least 8 characters, uppercase, lowercase, number, and symbol, no any password strong check 
- Keep password confirmation, CAPTCHA, email verification, authentication, and all server protections unchanged.
- Present the Gizmo Dan Kaita logo on its requested blue background in shared headers and side navigation.
- Enable intent-based route preloading so internal pages begin loading before a click completes, reducing perceived navigation delay.
- Preserve the existing Gizmo-derived design tokens and responsive panel styling

## Validation

- Check signup validation accepts an 8-character weak password and rejects shorter passwords.
- Run TypeScript checks and verify mobile/desktop navigation visually.