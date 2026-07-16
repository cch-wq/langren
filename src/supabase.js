import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://opfzulpitspblasmybba.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_M3SmjoDJZ3PUyLH_nF3Awg_v8O-EG6i'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
