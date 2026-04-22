import React from 'react';

const FilterBar = ({ filters, onChange, onSearch }) => (
  <div className="filter-bar">
    <input
      placeholder="Title"
      name="title"
      value={filters.title}
      onChange={onChange}
    />
    <input
      placeholder="Location"
      name="location"
      value={filters.location}
      onChange={onChange}
    />
    <input
      placeholder="Company"
      name="company"
      value={filters.company}
      onChange={onChange}
    />
    <button className="btn" onClick={onSearch}>Filter</button>
  </div>
);

export default FilterBar;
