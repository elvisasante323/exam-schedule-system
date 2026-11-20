import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const emptyFilters = { date: "", name: "", location: "" };
const MODAL_CLOSE_MS = 220;

export default function FilterModal(props) {
  const {
    hide,
    setHide,
    setFiltersObject,
    title = "Filter sessions",
    nameLabel = "Candidate name",
    namePlaceholder = "Match any candidate",
  } = props;
  const [filterDate, setFilterDate] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [isPresent, setIsPresent] = useState(!hide);
  const [isOpen, setIsOpen] = useState(!hide);

  const toastStyle = {
    style: {
      borderRadius: "12px",
      padding: "12px",
      color: "#FFFFFF",
      backgroundColor: "#0B1F3A",
    },
  };

  useEffect(() => {
    if (!hide) {
      setIsPresent(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsOpen(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setIsOpen(false);
    const timeout = setTimeout(() => setIsPresent(false), MODAL_CLOSE_MS);
    return () => clearTimeout(timeout);
  }, [hide]);

  if (!isPresent) {
    return null;
  }

  const handleAddFilters = () => {
    const params = { ...emptyFilters };
    const dateRegEx = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    const messages = [];

    if (filterDate !== "" && dateRegEx.test(filterDate)) {
      params.date = filterDate;
      messages.push(`Date: ${params.date}`);
      setFilterDate("");
    }

    if (filterName.trim() !== "") {
      params.name = filterName.trim();
      messages.push(`Name: ${params.name}`);
      setFilterName("");
    }

    if (filterLocation.trim() !== "") {
      params.location = filterLocation.trim();
      messages.push(`Location: ${params.location}`);
      setFilterLocation("");
    }

    if (messages.length) {
      toast(`Filters applied · ${messages.join(" · ")}`, toastStyle);
    }

    setFiltersObject(params);
    setHide(true);
  };

  const handleClose = () => {
    setHide(true);
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className={`FilterModal${isOpen ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-modal-title"
      onClick={handleOverlayClick}
    >
      <div className="ModalContent">
        <div className="ModalHeader">
          <h4 className="ModalTitle" id="filter-modal-title">
            {title}
          </h4>
        </div>
        <div className="ModalBody">
          <div className="FilterField">
            <label htmlFor="datetime-field">Date</label>
            <input
              type="date"
              name="date"
              id="datetime-field"
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
            />
          </div>
          <div className="FilterField">
            <label htmlFor="candidate-name-field">{nameLabel}</label>
            <input
              type="text"
              name="candidate-name"
              id="candidate-name-field"
              placeholder={namePlaceholder}
              value={filterName}
              onChange={(event) => setFilterName(event.target.value)}
            />
          </div>
          <div className="FilterField">
            <label htmlFor="location-field">Location</label>
            <input
              type="text"
              name="location"
              id="location-field"
              placeholder="Country"
              value={filterLocation}
              onChange={(event) => setFilterLocation(event.target.value)}
            />
          </div>
          <div className="ButtonField">
            <button
              className="FilterButton"
              id="AddFilterButton"
              type="button"
              onClick={handleAddFilters}
            >
              Apply filters
            </button>
          </div>
        </div>
        <div className="ModalFooter">
          <button className="Button" type="button" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
