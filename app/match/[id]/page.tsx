'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image'; // <- New
import SelectGameWinnerForm from '../../components/SelectGameWinnerForm';
import Link from 'next/link'; // <- New

export default function MatchPage() {
  // (no changes to hooks)

  // (no changes to useEffect or fetchOffers)

  const { match, latestGame, players, currentUserId } = data;
  const team1: number[] = latestGame?.team_1_members || [];
  const teamA: number[] = latestGame?.team_a_members || [];

  const getPlayer = (pid: number) => players.find((p: any) => p.id === pid);

  const isInProgress = latestGame?.status === 'In progress';
  const isAuction = latestGame?.status === 'Auction pending';
  const winningTeam = latestGame?.winning_team;

  const isWinner = winningTeam === 'team_1' ? team1.includes(currentUserId) : teamA.includes(currentUserId);
  const isLoser = !isWinner;

  const myTeam = winningTeam === 'team_1' ? team1 : teamA;
  const offerCandidates = myTeam.filter((pid) => pid !== currentUserId);

  const alreadyAcceptedOffer = offers.find(
    (o) => o.status === 'accepted' && o.target_player_id === currentUserId
  );

  // (handleSubmitOffer and handleAcceptOffer stay the same)

  return (
    <div className="max-w-5xl mx-auto p-6 text-gray-100">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/dashboard">
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl">
            ← Back to Dashboard
          </button>
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-yellow-400 drop-shadow-md mb-2">
          Match #{match.id}
        </h1>
        <p className="text-lg text-gray-400 flex justify-center items-center gap-2">
          Game #{latestGame.id}
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            latestGame.status === 'Auction pending' ? 'bg-yellow-500 text-black' :
            latestGame.status === 'In progress' ? 'bg-blue-500' :
            latestGame.status === 'Finished' ? 'bg-green-500' :
            'bg-gray-500'
          }`}>
            {latestGame.status}
          </span>
        </p>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Team 1 */}
        <div className="bg-gradient-to-b from-red-900 via-red-800 to-red-700 p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col items-center mb-4">
            <Image src="/Team1.png" alt="Team 1 Logo" width={64} height={64} />
            <h2 className="text-2xl font-semibold mt-2">Team 1</h2>
          </div>
          <ul className="space-y-2">
            {team1.map((pid) => {
              const player = getPlayer(pid);
              return (
                <li key={`team1-${pid}`} className="flex justify-between items-center">
                  <span>{player?.username || 'Unknown'}</span>
                  <span className="flex items-center gap-1">
                    {player?.gold ?? 0}
                    <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Team A */}
        <div className="bg-gradient-to-b from-blue-900 via-blue-800 to-blue-700 p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col items-center mb-4">
            <Image src="/TeamA.png" alt="Team A Logo" width={64} height={64} />
            <h2 className="text-2xl font-semibold mt-2">Team A</h2>
          </div>
          <ul className="space-y-2">
            {teamA.map((pid) => {
              const player = getPlayer(pid);
              return (
                <li key={`teamA-${pid}`} className="flex justify-between items-center">
                  <span>{player?.username || 'Unknown'}</span>
                  <span className="flex items-center gap-1">
                    {player?.gold ?? 0}
                    <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Winner */}
      {latestGame?.winning_team && (
        <div className="text-center mb-8">
          <p className="text-green-400 font-bold text-xl">
            Winning Team: {latestGame.winning_team === 'team_1' ? 'Team 1' : 'Team A'}
          </p>
        </div>
      )}

      {/* Select Winner Form */}
      {isInProgress && (
        <div className="mb-8">
          <SelectGameWinnerForm gameId={latestGame.id} show={isInProgress} />
        </div>
      )}

      {/* Auction Phase */}
      {isAuction && (
        <div className="bg-yellow-300 bg-opacity-20 p-6 rounded-2xl shadow-lg mb-8">
          <h3 className="text-2xl font-bold mb-4 text-yellow-400 text-center">Auction Phase</h3>

          {isWinner && (
            <div className="mb-6">
              <p className="font-semibold mb-2 text-center">Make an Offer:</p>
              <div className="flex flex-col md:flex-row items-center gap-4 justify-center">
                {/* (offer form stays same) */}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xl font-bold mb-2">Current Offers</h4>
            <ul className="space-y-4">
              {offers.map((offer) => {
                const from = getPlayer(offer.from_player_id);
                const to = getPlayer(offer.target_player_id);
                const canAccept = isLoser && offer.status === 'pending' && !alreadyAcceptedOffer;

                return (
                  <li
                    key={offer.id}
                    className="flex flex-col md:flex-row items-center justify-between bg-gray-800 p-4 rounded-xl"
                  >
                    <span>
                      <strong>{from?.username}</strong> offers <strong className="text-yellow-400">{offer.offer_amount}</strong> 
                      <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1" /> 
                      to <strong>{to?.username}</strong>
                    </span>
                    {canAccept && (
                      <button
                        onClick={() => handleAcceptOffer(offer.id)}
                        disabled={accepting}
                        className="mt-2 md:mt-0 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                      >
                        {accepting ? 'Accepting...' : 'Accept Offer'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
