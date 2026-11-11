/*
# AI agent settings and request logs

1. New Tables
- `agent_settings`: a single row that controls the website chat assistant.
  - active_provider: which AI service answers visitors (anthropic, openai or gemini). Default anthropic.
  - model_anthropic, model_openai, model_gemini: the model name used for each provider.
  - temperature (0 to 1, default 0.5) and max_tokens (50 to 4000, default 600).
  - system_prompt: the instructions given to the assistant, seeded with the current CupidCreativeX prompt.
  - fallback_enabled: when true, a failed provider is replaced by the next configured one.
  - updated_at and updated_by are set automatically when a row changes.
- `agent_logs`: one row per AI request, with provider, model, latency in milliseconds, status (ok or error) and any error message.

2. Security
- Row level security is enabled on both tables.
- Only signed-in admins listed in `admin_emails` can read or change agent settings and read logs.
- Admins can change only the settings columns. They cannot set updated_at or updated_by themselves.
- The chat function uses the service role to read settings and write logs. Visitors have no access.
- API keys are never stored in these tables. They are kept as secrets.

3. Important notes
- Safe to re-run. The settings row is created only if it does not already exist.
*/

CREATE TABLE IF NOT EXISTS public.agent_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active_provider text NOT NULL DEFAULT 'anthropic' CHECK (active_provider IN ('anthropic', 'openai', 'gemini')),
  model_anthropic text NOT NULL DEFAULT 'claude-sonnet-5-5' CHECK (char_length(btrim(model_anthropic)) BETWEEN 1 AND 100),
  model_openai text NOT NULL DEFAULT 'gpt-4o-mini' CHECK (char_length(btrim(model_openai)) BETWEEN 1 AND 100),
  model_gemini text NOT NULL DEFAULT 'gemini-2.0-flash' CHECK (char_length(btrim(model_gemini)) BETWEEN 1 AND 100),
  temperature numeric(3, 2) NOT NULL DEFAULT 0.5 CHECK (temperature >= 0 AND temperature <= 1),
  max_tokens integer NOT NULL DEFAULT 600 CHECK (max_tokens BETWEEN 50 AND 4000),
  system_prompt text NOT NULL CHECK (char_length(system_prompt) BETWEEN 1 AND 8000),
  fallback_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.agent_settings (id, system_prompt)
VALUES (1, $prompt$You are the customer service assistant for CupidCreativeX ("Visually Transforming..."), a digital agency that helps businesses streamline operations and grow through digital solutions.

SERVICES: Web & App Development, Generative AI Services, UI/UX Design, Data Analytics & Insights, Graphics Design, Digital Consultation, Digital Marketing.

OFFER: 20% off a customer's first project.

CONTACT: Phone 0707988777, 09039454419. Email info@cupidcreativex.com. Website cupidcreativex.com.

BEHAVIOR: Be friendly, professional and concise (2-4 sentences). Answer only from the information above. Never quote prices, timelines or guarantees; say the team provides a quote after learning about the project. If unsure, say so and offer to connect them with the team. To book or get a quote, collect name, email or phone, service needed and a short project description, then call save_lead and confirm the team will follow up. Politely decline unrelated topics. If the customer is upset or asks for a human, share the phone and email.$prompt$)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.touch_agent_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_agent_settings_trigger ON public.agent_settings;
CREATE TRIGGER touch_agent_settings_trigger
  BEFORE UPDATE ON public.agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_agent_settings();

CREATE TABLE IF NOT EXISTS public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('anthropic', 'openai', 'gemini')),
  model text NOT NULL,
  latency_ms integer NOT NULL CHECK (latency_ms >= 0),
  status text NOT NULL CHECK (status IN ('ok', 'error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_logs_created_at_idx ON public.agent_logs (created_at DESC);

ALTER TABLE public.agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.agent_settings FROM anon, authenticated;
REVOKE ALL ON public.agent_logs FROM anon, authenticated;

GRANT SELECT ON public.agent_settings TO authenticated;
GRANT UPDATE (active_provider, model_anthropic, model_openai, model_gemini, temperature, max_tokens, system_prompt, fallback_enabled)
  ON public.agent_settings TO authenticated;
GRANT SELECT ON public.agent_logs TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.agent_settings TO service_role;
GRANT SELECT, INSERT ON public.agent_logs TO service_role;

DROP POLICY IF EXISTS "admin_select_agent_settings" ON public.agent_settings;
CREATE POLICY "admin_select_agent_settings" ON public.agent_settings FOR SELECT
  TO authenticated USING (public.is_lead_admin());

DROP POLICY IF EXISTS "admin_update_agent_settings" ON public.agent_settings;
CREATE POLICY "admin_update_agent_settings" ON public.agent_settings FOR UPDATE
  TO authenticated USING (public.is_lead_admin()) WITH CHECK (public.is_lead_admin());

DROP POLICY IF EXISTS "admin_select_agent_logs" ON public.agent_logs;
CREATE POLICY "admin_select_agent_logs" ON public.agent_logs FOR SELECT
  TO authenticated USING (public.is_lead_admin());
