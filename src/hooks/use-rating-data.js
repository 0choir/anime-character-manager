'use client';
import { useEffect, useState } from 'react';
import { fetchDashboard, fetchSnapshot, fetchAdminData } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export function useDashboard(version) {
  const [state,setState] = useState({data:null,error:'',version:-1});
  useEffect(()=>{
    const controller = new AbortController(); let active = true;
    fetchDashboard(controller.signal).then(data=>{if(active)setState({data,error:'',version});})
      .catch(error=>{if(active)setState({data:null,error:error.message,version});});
    return ()=>{active=false;controller.abort();};
  },[version]);
  return {...state,loading:state.version!==version};
}
export function useSnapshot(name, version) {
  const [state,setState] = useState({data:[],error:'',key:''});
  const key = `${version}:${name}`;
  useEffect(()=>{
    if (!name) return;
    const controller=new AbortController(); let active=true;
    fetchSnapshot(name,controller.signal).then(data=>{if(active)setState({data,error:'',key});})
      .catch(error=>{if(active)setState({data:[],error:error.message,key});});
    return ()=>{active=false;controller.abort();};
  },[name,key]);
  return {data:name&&state.key===key?state.data:[],error:name&&state.key===key?state.error:'',loading:Boolean(name)&&state.key!==key};
}
export function useAdminData(isAdmin,version) {
  const [state,setState]=useState({data:null,error:'',version:-1});
  useEffect(()=>{
    if(!isAdmin)return;
    let active=true; const controller=new AbortController();
    fetchAdminData(controller.signal).then(data=>{if(active)setState({data,error:'',version});})
      .catch(error=>{if(active)setState({data:null,error:error.message,version});});
    return ()=>{active=false;controller.abort();};
  },[isAdmin,version]);
  return {data:isAdmin&&state.version===version?state.data:null,error:isAdmin&&state.version===version?state.error:'',loading:isAdmin&&state.version!==version};
}
export function useAuth() {
  const [state,setState]=useState({user:null,isAdmin:false,loading:true,error:''});
  useEffect(()=>{
    if(!supabase)return;
    let active=true,request=0;
    async function resolve(session) {
      const token=++request;
      if(!session){if(active)setState({user:null,isAdmin:false,loading:false,error:''});return;}
      const {data,error}=await supabase.rpc('rating_is_admin');
      if(active&&request===token)setState({user:session.user,isAdmin:data===true,loading:false,error:error?.message||''});
    }
    // Do not await Supabase calls inside onAuthStateChange's lock.
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>{if(active)resolve(session);},0);});
    supabase.auth.getSession().then(({data,error})=>{
      if(error){if(active)setState({user:null,isAdmin:false,loading:false,error:error.message});}
      else if(active)resolve(data.session);
    });
    return ()=>{active=false;request++;subscription.unsubscribe();};
  },[]);
  return supabase?state:{user:null,isAdmin:false,loading:false,error:'接続設定がありません。'};
}

