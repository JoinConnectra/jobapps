export async function getStudent(){
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/student/profile`,{ cache:"no-store" });
  if(!res.ok) return null;
  return res.json();
}
