# DEWA Extractor

```
CREATE TABLE public.responses (
	id SERIAL PRIMARY KEY,
	response jsonb,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
