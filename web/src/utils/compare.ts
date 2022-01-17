export default function compare(a: any, b: any) {
  if (a.fullName < b.fullName) {
    return -1;
  }
  if (a.fullName > b.fullName) {
    return 1;
  }
  return 0;
}
