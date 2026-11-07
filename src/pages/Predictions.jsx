import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, CheckCircle, XCircle, Clock, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import DisciplineBadge from '@/components/shared/DisciplineBadge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const METHODS = ['KO/TKO', 'Submission', 'Decision', 'Draw'];
const ROUNDS = [1, 2, 3, 4, 5];

const POINT_RULES = [
  { label: 'Correct Winner', pts: 10, color: 'text-green-400' },
  { label: '+ Correct Method', pts: 15, color: 'text-blue-400' },
  { label: '+ Correct Round', pts: 25, color: 'text-amber-400' },
];

export default function Predictions() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: fights = [] } = useQuery({
    queryKey: ['all-fights'],
    queryFn: () => base44.entities.Fight.list('-created_date', 200),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date', 100),
  });

  const { data: myPredictions = [] } = useQuery({
    queryKey: ['my-predictions', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.Prediction.filter({ user_id: currentUser.id }) : [],
    enabled: !!currentUser,
  });

  const upcomingFights = fights.filter(f => f.status === 'scheduled');
  const completedFights = fights.filter(f => f.status === 'completed');

  const predictedFightIds = new Set(myPredictions.map(p => p.fight_id));
  const unpredicted = upcomingFights.filter(f => !predictedFightIds.has(f.id));
  const predicted = upcomingFights.filter(f => predictedFightIds.has(f.id));

  const totalPts = myPredictions.reduce((sum, p) => sum + (p.points_earned || 0), 0);
  const correct = myPredictions.filter(p => p.is_correct_winner).length;

  const getEvent = (eventId) => events.find(e => e.id === eventId);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div className="flex items-center gap-3">
        <Link to="/fantasy" className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Predictions</h1>
          <p className="text-xs text-muted-foreground">Predict. Win. Climb.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {POINT_RULES.map(r => (
          <div key={r.label} className="rounded-xl border border-border/60 bg-card/50 p-3 text-center">
            <p className={cn("text-xl font-bold font-heading", r.color)}>+{r.pts}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{r.label}</p>
          </div>
        ))}
      </div>

      {/* My Score */}
      {currentUser && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">My Prediction Score</p>
            <p className="font-heading text-2xl font-bold text-primary">{totalPts} pts</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Correct calls</p>
            <p className="font-heading text-2xl font-bold">{correct} / {myPredictions.length}</p>
          </div>
        </div>
      )}

      {/* Tab */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
        {[
          { id: 'upcoming', label: 'Predict' },
          { id: 'mypicks', label: 'My Picks' },
          { id: 'results', label: 'Results' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn("flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all",
              activeTab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'upcoming' && (
        <div className="space-y-3">
          {unpredicted.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">No fights to predict right now, or you've predicted all of them!</p>
          ) : unpredicted.map(fight => (
            <PredictFightCard
              key={fight.id}
              fight={fight}
              event={getEvent(fight.event_id)}
              currentUser={currentUser}
              queryClient={queryClient}
            />
          ))}
        </div>
      )}

      {activeTab === 'mypicks' && (
        <div className="space-y-3">
          {myPredictions.filter(p => !p.is_resolved).length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">No pending predictions.</p>
          ) : myPredictions.filter(p => !p.is_resolved).map(pred => {
            const fight = fights.find(f => f.id === pred.fight_id);
            return fight ? <PredictionResultCard key={pred.id} prediction={pred} fight={fight} /> : null;
          })}
        </div>
      )}

      {activeTab === 'results' && (
        <div className="space-y-3">
          {myPredictions.filter(p => p.is_resolved).length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">No resolved predictions yet.</p>
          ) : myPredictions.filter(p => p.is_resolved).map(pred => {
            const fight = fights.find(f => f.id === pred.fight_id);
            return fight ? <PredictionResultCard key={pred.id} prediction={pred} fight={fight} resolved /> : null;
          })}
        </div>
      )}
    </div>
  );
}

function PredictFightCard({ fight, event, currentUser, queryClient }) {
  const [expanded, setExpanded] = useState(false);
  const [winner, setWinner] = useState('');
  const [method, setMethod] = useState('');
  const [round, setRound] = useState(null);

  const mutation = useMutation({
    mutationFn: () => base44.entities.Prediction.create({
      user_id: currentUser.id,
      fight_id: fight.id,
      event_id: fight.event_id,
      predicted_winner_name: winner,
      predicted_method: method || undefined,
      predicted_round: round || undefined,
    }),
    onSuccess: () => {
      toast.success('Prediction submitted!');
      queryClient.invalidateQueries({ queryKey: ['my-predictions'] });
      setExpanded(false);
    },
  });

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
      <button className="w-full p-4 text-left flex items-center justify-between" onClick={() => setExpanded(!expanded)}>
        <div>
          {event && <p className="text-[10px] text-muted-foreground mb-1">{event.name}</p>}
          <p className="font-heading text-base font-bold uppercase tracking-wide">
            {fight.fighter_a_name} <span className="text-primary">VS</span> {fight.fighter_b_name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <DisciplineBadge discipline={fight.discipline} />
            {fight.weight_class && <span className="text-[10px] text-muted-foreground">{fight.weight_class}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Predict</span>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50 p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Pick the winner</p>
            <div className="grid grid-cols-2 gap-2">
              {[fight.fighter_a_name, fight.fighter_b_name].map(name => (
                <button key={name} onClick={() => setWinner(name)}
                  className={cn("py-3 px-4 rounded-lg border text-sm font-semibold transition-all text-center",
                    winner === name ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground")}>
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Method (optional +15pts)</p>
            <div className="flex flex-wrap gap-2">
              {METHODS.map(m => (
                <button key={m} onClick={() => setMethod(method === m ? '' : m)}
                  className={cn("py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all",
                    method === m ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground")}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {(method === 'KO/TKO' || method === 'Submission') && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Round (optional +25pts)</p>
              <div className="flex gap-2">
                {ROUNDS.slice(0, fight.rounds || 3).map(r => (
                  <button key={r} onClick={() => setRound(round === r ? null : r)}
                    className={cn("w-10 h-10 rounded-lg border text-sm font-bold transition-all",
                      round === r ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground")}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => mutation.mutate()}
            disabled={!winner || mutation.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            Lock In Prediction
          </button>
        </div>
      )}
    </div>
  );
}

function PredictionResultCard({ prediction, fight, resolved }) {
  return (
    <div className={cn(
      "rounded-xl border p-4",
      resolved
        ? prediction.is_correct_winner ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
        : "border-border/60 bg-card/50"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-sm font-bold uppercase tracking-wide">
            {fight.fighter_a_name} vs {fight.fighter_b_name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your pick: <span className="text-foreground font-semibold">{prediction.predicted_winner_name}</span>
            {prediction.predicted_method && <> · {prediction.predicted_method}</>}
            {prediction.predicted_round && <> · R{prediction.predicted_round}</>}
          </p>
        </div>
        {resolved && (
          <div className="flex items-center gap-1">
            {prediction.is_correct_winner
              ? <CheckCircle className="w-5 h-5 text-green-400" />
              : <XCircle className="w-5 h-5 text-red-400" />}
            <span className="font-bold text-sm text-primary">+{prediction.points_earned}</span>
          </div>
        )}
        {!resolved && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3" /> Pending
          </span>
        )}
      </div>
    </div>
  );
}