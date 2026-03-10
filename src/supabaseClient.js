import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jtoeketvegzlghoiiene.supabase.co'
const supabaseKey = 'sb_publishable_AN6z2UwPCltfEMqSaJCVPw_L9kdGEJ_'

export const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase