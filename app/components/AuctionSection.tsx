'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Offer } from '@/lib/types';

interface AuctionSectionProps {
  isAuction: boolean;
  isWinner: boolean;
  isLoser: boolean;
  alreadySubmittedOffer: boolean;
  alreadyAcceptedOffer: boolean;
  offerCandidates: string[];
  offers: Offer[];
  getPlayer: (id: string) => { username: string } | undefined;
  handleSubmitOffer: () => void;
  handleAcceptOffer: (offerId: number) => void;
  selectedPlayer: string;
  setSelectedPlayer: (id: string) => void;
  offerAmount: string;
  setOfferAmount: (amount: string) => void;
  submitting: boolean;
  accepting: boolean;
}

export default function AuctionSection({
  isAuction,
  isWinner,
  isLoser,
  alreadySubmittedOffer,
  alreadyAcceptedOffer,
  offerCandidates,
  offers,
  getPlayer,
  handleSubmitOffer,
  handleAcceptOffer,
  selectedPlayer,
  setSelectedPlayer,
  offerAmount,
  setOfferAmount,
  submitting,
  accepting,
}: AuctionSectionProps) {
  if (!isAuction) return null;

  return (
    <div className="bg-slate-600 bg-opacity-40 p-6 rounded-2xl shadow-lg mb-8">
      <h3 className="text-2xl font-bold mb-4 text-center">Auction Phase</h3>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Side: Offer Form */}
        <div className="flex-1 w-full">
          {isWinner && !alreadySubmittedOffer ? (
            <div className="mb-6">
              <p className="font-semibold mb-2 text-center md:text-left">Make an Offer:</p>
              <div className="flex flex-col md:flex-row items-center gap-4 justify-center md:justify-start">
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="px-3 py-2 rounded-lg text-black"
                >
                  <option value="">Select Player</option>
                  {offerCandidates.map((pid) => {
                    const player = getPlayer(pid);
                    return (
                      <option key={pid} value={pid}>
                        {player?.username || 'Unknown'}
                      </option>
                    );
                  })}
                </select>

                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="Offer Amount (250-2000)"
                  className="px-3 py-2 rounded-lg text-black"
                />

                <button
                  onClick={handleSubmitOffer}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  {submitting ? 'Submitting...' : 'Submit Offer'}
                </button>
              </div>
            </div>
          ) : isWinner && alreadySubmittedOffer && (
            <div className="mb-6 text-center text-yellow-300 font-semibold">
              ✅ You've already submitted your offer.
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Shopkeeper Image */}
            <div className="hidden md:flex md:w-48 justify-center md:justify-start mb-6 md:mb-0">
              <Image
                src="/Shopkeeper.png"
                alt="Shopkeeper"
                width={192}
                height={192}
                className="rounded-xl"
              />
            </div>

            {/* Offers List */}
            <div className="flex-1">
              <h4 className="text-xl font-bold mb-4">Current Offers</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {offers.map((offer) => {
                  const from = getPlayer(offer.from_player_id);
                  const to = getPlayer(offer.target_player_id);
                  const canAccept =
                    isLoser && offer.status === 'pending' && !alreadyAcceptedOffer;

                  return (
                    <div
                      key={offer.id}
                      className="bg-gray-800 p-4 rounded-2xl shadow-lg border border-gray-700 flex flex-col justify-between h-full"
                    >
                      <div className="flex flex-col gap-2 mb-4">
                        <div className="flex gap-2">
                          <span className="text-lg text-gray-300">From</span>
                          <span className="text-lg font-semibold text-yellow-300">{from?.username}</span>
                        </div>

                        <div className="mt-2 text-sm text-gray-300">
                          If accepted:
                          <ul className="list-disc list-inside text-gray-300 mt-1">
                            <li>
                              <strong>{from?.username}</strong> gains{' '}
                              <span className="text-yellow-400 font-bold">{offer.offer_amount}</span>{' '}
                              <Image
                                src="/Gold_symbol.webp"
                                alt="Gold"
                                width={16}
                                height={16}
                                className="inline-block ml-1"
                              />
                              starting gold
                            </li>
                            <li>
                              <strong>{to?.username}</strong> moves to the{' '}
                              <span className="text-red-400 font-bold">losing team</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {canAccept ? (
                        <button
                          onClick={() => handleAcceptOffer(offer.id)}
                          disabled={accepting}
                          className="mt-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                        >
                          {accepting ? 'Accepting...' : 'Accept Offer'}
                        </button>
                      ) : (
                        <div className="mt-auto text-sm text-gray-400 italic">
                          {offer.status === 'accepted'
                            ? 'Accepted'
                            : offer.status === 'rejected'
                            ? 'Rejected'
                            : 'Waiting for response'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
