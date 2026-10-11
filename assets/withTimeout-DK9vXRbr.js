function u(t,r,i){let e;const o=new Promise((n,m)=>{e=setTimeout(()=>m(new Error(i)),r)});return Promise.race([t,o]).finally(()=>clearTimeout(e))}export{u as w};
