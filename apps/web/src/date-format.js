// Keep displayed practice dates consistent with the existing practice-day policy.
export const PRACTICE_TIME_ZONE='Asia/Calcutta';
export const PRACTICE_TIME_ZONE_LABEL='India Standard Time (IST)';

export function formatPracticeDate(value,{fallback='Not available',...options}={}){
  const date=value===null||value===undefined||value===''?null:new Date(value);
  if(!date||!Number.isFinite(date.getTime()))return fallback;
  const defaults=options.dateStyle||options.timeStyle?{}:{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'};
  return new Intl.DateTimeFormat('en-IN',{...defaults,...options,timeZone:PRACTICE_TIME_ZONE}).format(date);
}
