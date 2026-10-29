const supportEmail='bhuvandhiman.pvt@gmail.com';

export default function SupportLink({children='Contact support',className='inline-link'}){
  return <a className={className} href={`mailto:${supportEmail}`}>{children}</a>;
}
