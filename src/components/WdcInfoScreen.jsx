import React, { useState } from 'react';
import './WdcInfoScreen.css';

function PlanCard({ planType }) {
  const [activeTab, setActiveTab] = useState(planType === 'standard' ? 'standard' : 'premium');
  
  const isStandardGroup = planType === 'standard';
  const isFlexyActive = isStandardGroup ? activeTab === 'flexy' : activeTab === 'premium-flexy';
  
  const tabs = isStandardGroup 
    ? [{ id: 'flexy', label: 'Flexy Standard' }, { id: 'standard', label: 'Standard' }]
    : [{ id: 'premium-flexy', label: 'Flexy Premium' }, { id: 'premium', label: 'Premium' }];

  const isPremiumTier = !isStandardGroup;
  const price = isPremiumTier ? '€349.99' : '€59.99';
  const priceLabel = isFlexyActive ? `${price} one-time` : `${price} / year`;
  const tierName = isPremiumTier
    ? (isFlexyActive ? 'Flexy Premium' : 'Premium')
    : (isFlexyActive ? 'Flexy Standard' : 'Standard');

  return (
    <div className={`wdc-plan-card ${isPremiumTier ? 'premium' : ''}`}>
      <div className="plan-tabs">
        {tabs.map(tab => (
          <button key={tab.id}
            className={`plan-tab ${activeTab === tab.id ? 'active' : ''} ${tab.id.includes('premium') || tab.id === 'premium' ? 'premium-tab-color' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="plan-header">
        <h4>{tierName}</h4>
        <span className="price">{priceLabel}</span>
      </div>

      {isFlexyActive && (
        <div className="flexy-badge-wrapper">
          <span className="flexy-badge">One-time payment • Valid for 3 years • 10 flights</span>
        </div>
      )}

      <p className="plan-desc">
        Benefits for <strong>you and 1 companion</strong>.
        {isFlexyActive
          ? ' Pay once and use your benefits for up to 10 flights over 3 years!'
          : ' You can subscribe when you book your next flight!'}
      </p>

      <ul className="plan-features">
        <li>✅ Special onboard coupons</li>
        <li>✅ Exclusive ticket promotions & personalized offers</li>
        <li>✅ €10.00 discount on flight fares from €29.99 *</li>
        <li>✅ €5.00 discount on checked-in baggage or 2 cabin bags & priority purchased online **</li>
        <li>✅ Priority customer care</li>
        <li>✅ Enhanced benefits with our partners for members</li>
        {isPremiumTier ? (
          <>
            <li className="premium-highlight">🌟 <strong>2 cabin bags & priority</strong></li>
            <li className="premium-highlight">🌟 <strong>Premium (unlimited) seat selection</strong></li>
          </>
        ) : (
          <>
            <li className="disabled">⛔ 2 cabin bags & priority (not included)</li>
            <li className="disabled">⛔ Premium seat selection (not included)</li>
          </>
        )}
      </ul>
      {isFlexyActive && (
        <p className="flexy-note">* Flexy plans include benefits for up to 10 flights within the 3‑year validity period.</p>
      )}
    </div>
  );
}

export default function WdcInfoScreen({ onBack }) {
  return (
    <div className="wdc-info-screen screen">
      <div className="wdc-info-header">
        <div className="wdc-header-icon">✈️</div>
        <h2>WIZZ <span className="header-accent">Discount Club</span></h2>
        <p className="wdc-tagline">Your ticket to smarter travel.</p>
      </div>

      {/* Value Impact Section */}
      <div className="wdc-value-impact">
        <h3>🎮 What You Can Win</h3>
        <p>Top 200 players win exclusive WDC rewards at the end of the challenge — from full Premium memberships to discounts and coupons!</p>
        <div className="value-tiers">
          <div className="value-tier gold">
            <span className="tier-rank">🥇 Rank 1</span>
            <span className="tier-prize">WDC Premium + 500€ credit</span>
            <span className="tier-value">Worth <strong>€849.99</strong></span>
          </div>
          <div className="value-tier silver">
            <span className="tier-rank">🥈 Rank 2-5</span>
            <span className="tier-prize">WDC Premium + €50–350 credit</span>
            <span className="tier-value">Worth up to <strong>€699.99</strong></span>
          </div>
          <div className="value-tier bronze">
            <span className="tier-rank">🥉 Rank 6-10</span>
            <span className="tier-prize">WDC Premium membership</span>
            <span className="tier-value">Worth <strong>€349.99</strong></span>
          </div>
          <div className="value-tier standard-tier">
            <span className="tier-rank">⭐ Rank 11-20</span>
            <span className="tier-prize">WDC Standard + €10–200 credit</span>
            <span className="tier-value">Worth up to <strong>€259.99</strong></span>
          </div>
          <div className="value-tier standard-tier">
            <span className="tier-rank">✈ Rank 21-50</span>
            <span className="tier-prize">WDC Standard membership</span>
            <span className="tier-value">Worth <strong>€59.99</strong></span>
          </div>
          <div className="value-tier discount-tier">
            <span className="tier-rank">🏷 Rank 51-100</span>
            <span className="tier-prize">50% off WDC subscription</span>
            <span className="tier-value">Save <strong>€29.99</strong></span>
          </div>
          <div className="value-tier discount-tier">
            <span className="tier-rank">🎫 Rank 101-200</span>
            <span className="tier-prize">€10 coupon on WDC</span>
            <span className="tier-value">Save <strong>€10.00</strong></span>
          </div>
        </div>
        <p className="credit-note">* "Credit" refers to Euros (€) that can be used towards Wizz Air flight bookings.</p>
      </div>

      {/* Subscription Plans */}
      <div className="wdc-plans-container">
        <div className="plans-section-header">
          <h3 className="plans-title">Choose Your Plan</h3>
          <p className="plans-subtitle">Yearly recurring or Flexy one-time — you decide!</p>
        </div>
        <PlanCard planType="standard" />
        <PlanCard planType="premium" />
      </div>

      <div className="wdc-actions">
         <button className="back-button" onClick={onBack}>Back to Menu</button>
      </div>
    </div>
  );
}
