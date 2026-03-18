# Austin Emery Portfolio

This is my personal portfolio site.

I originally had a Wix portfolio because it was required for school projects. It did the job, but it never really felt like mine. As graduation started getting closer and I began seriously looking for work, it felt like the right time to rebuild everything from the ground up and actually take ownership of how it looks, works, and is deployed.

So this is that version.

---

The goal here wasn’t to over-engineer anything, just to build something clean, real, and easy to navigate. Instead of throwing everything onto one long page, I split things out so you can actually explore what I’ve been working on without digging.

Projects, write-ups, certifications, books, all of it has its own space.

---

For the site's structure, it’s pretty simple on purpose.

Just static HTML and CSS, hosted on Cloudflare Pages. I added a backend function for the contact form because I didn’t want to just drop my email on the page and deal with spam later.

Messages go through a Cloudflare function, get filtered with Turnstile, and are sent using Resend. There’s also an auto-reply so people know the message actually went through.

It’s a small thing, but it’s closer to how real systems handle this instead of using a basic mailto link.

---

This project is really more about how I approach building things than the site itself.

I try to keep things simple, but intentional. Build something that actually works, fix problems as they come up, and keep improving it over time instead of trying to make it perfect on the first pass.

---

I’m still updating this as I go.

New projects get added, write-ups get cleaned up, and I’ll keep improving the layout and backend where it makes sense. This isn’t a finished product, it’s something that evolves as I do.

---

If you’re checking this out, I appreciate it.

Austin
