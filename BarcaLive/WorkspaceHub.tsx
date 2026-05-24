import React from 'react';
import { Mail, Video, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getAccessToken } from '../lib/auth';

export default function WorkspaceHub() {
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [meetLink, setMeetLink] = React.useState('');

  const scheduleMeet = async () => {
    setLoading(true);
    setStatus('Creating Google Meet space...');
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Requires Google Sign-in with Workspace scopes.");

      const res = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error("Failed to create Meet space");
      const data = await res.json();
      setMeetLink(data.meetingUri);
      setStatus('Meet Space Created Successfully!');
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    const confirmed = window.confirm("Are you sure you want to send a test email to yourself via Gmail?");
    if (!confirmed) return;

    setLoading(true);
    setStatus('Sending Gmail message...');
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Requires Google Sign-in with Workspace scopes.");

      // For simplification, fetch the user's own email from their profile if possible,
      // or send to "me" (authenticated user's inbox). We will send to 'ME'.
      const message = [
        `To: me`,
        `Subject: Barca-Live VIP Meeting Invite`,
        '',
        `You have successfully initiated a VIP session.`,
        meetLink ? `Join here: ${meetLink}` : ''
      ].join('\n');

      const encodedMessage = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedMessage }),
      });

      if (!res.ok) throw new Error("Failed to send email");
      setStatus('Email sent to your inbox!');
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-amber-400/10 border border-amber-400/30 rounded-2xl flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h3 className="text-white font-black uppercase text-xs tracking-wider">Workspace Integrations</h3>
          <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-1">Google Meet & Gmail Connectors</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={scheduleMeet}
          disabled={loading}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4 text-blue-400" />}
          Setup Premium Meet
        </button>
        <button
          onClick={sendEmail}
          disabled={loading || !meetLink}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 text-red-400" />}
          Email Invites
        </button>
      </div>

      {meetLink && (
        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-center justify-between">
          <div className="text-[10px] font-mono text-blue-400">{meetLink}</div>
          <a href={meetLink} target="_blank" rel="noreferrer" className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">Join</a>
        </div>
      )}

      {status && (
        <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
          {status}
        </p>
      )}
    </div>
  );
}
