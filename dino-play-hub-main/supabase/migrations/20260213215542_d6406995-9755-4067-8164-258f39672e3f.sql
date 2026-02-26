
-- Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'worker');

-- Tabla de perfiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabla de roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Función has_role (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Configuración diaria
CREATE TABLE public.daily_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_date DATE NOT NULL UNIQUE,
  base_money INTEGER NOT NULL DEFAULT 0,
  initial_tokens INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_config ENABLE ROW LEVEL SECURITY;

-- Liquidaciones
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_date DATE NOT NULL,
  worker_id UUID REFERENCES auth.users(id) NOT NULL,
  initial_tokens INTEGER NOT NULL DEFAULT 0,
  final_tokens INTEGER NOT NULL DEFAULT 0,
  vr_uses INTEGER NOT NULL DEFAULT 0,
  arcade_coupons INTEGER NOT NULL DEFAULT 0,
  vr_coupons INTEGER NOT NULL DEFAULT 0,
  base_money INTEGER NOT NULL DEFAULT 0,
  arcade_sales INTEGER NOT NULL DEFAULT 0,
  vr_sales INTEGER NOT NULL DEFAULT 0,
  gross_total INTEGER NOT NULL DEFAULT 0,
  net_profit INTEGER NOT NULL DEFAULT 0,
  opening_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Checklists
CREATE TABLE public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID REFERENCES public.settlements(id) ON DELETE CASCADE NOT NULL,
  machines_disconnected BOOLEAN NOT NULL DEFAULT false,
  machines_cleaned BOOLEAN NOT NULL DEFAULT false,
  floor_swept BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_config_updated_at BEFORE UPDATE ON public.daily_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger auto-crear perfil al registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies: profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: daily_config
CREATE POLICY "Authenticated users can view daily config" ON public.daily_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage daily config" ON public.daily_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: settlements
CREATE POLICY "Workers can view own settlements" ON public.settlements FOR SELECT USING (auth.uid() = worker_id);
CREATE POLICY "Admins can view all settlements" ON public.settlements FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers can create own settlements" ON public.settlements FOR INSERT WITH CHECK (auth.uid() = worker_id);
CREATE POLICY "Admins can manage all settlements" ON public.settlements FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: checklists
CREATE POLICY "Workers can view own checklists" ON public.checklists FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.settlements s WHERE s.id = settlement_id AND s.worker_id = auth.uid())
);
CREATE POLICY "Workers can create checklists" ON public.checklists FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.settlements s WHERE s.id = settlement_id AND s.worker_id = auth.uid())
);
CREATE POLICY "Admins can manage all checklists" ON public.checklists FOR ALL USING (public.has_role(auth.uid(), 'admin'));
