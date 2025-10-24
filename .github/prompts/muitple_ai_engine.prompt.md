---
mode: agent
---
Define the task to achieve, including specific requirements, constraints, and success criteria.

I want to implenment a vey specific feature.Currently the cod ebase is calling a specific AI Engine, namely Anthropic, but I want it to be able to call deifferent ones, like GPT-4, Gemini Pro, etc.
The ideia is that the user can choose which AI engine to use, and the system will route the request to the selected engine. It will be initially via .env file or environment variable or a configuration file, wha tis most suitable for this use case, but in the future it could be a user preference stored in a database or even a drop down box in the UI.

There will a variable telling what are the possible AI engines and their configuration as well as the default one.

The code for that should be very modular and define a very precise interface where the engine is initialized only after knowing which ones should be used and at the moment it is needed.

Ideally it is some sort of dependency injection where it is used, since it can be used in many places.

One of these engines should be totally free to be used, specially because this is a demo project, so the user can test it without having to pay for it. It can be a local model, like llama.cpp or something like that, or an API that has a free tier, like OpenAI or others.
